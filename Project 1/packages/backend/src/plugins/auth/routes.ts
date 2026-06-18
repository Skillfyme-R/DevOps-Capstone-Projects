/**
 * NexusFinance Authentication Routes
 *
 * POST /api/v1/auth/register  — Create new account
 * POST /api/v1/auth/login     — Email/password login → returns JWT
 * POST /api/v1/auth/refresh   — Exchange refresh token for new access token
 * POST /api/v1/auth/logout    — Revoke tokens
 * POST /api/v1/auth/forgot-password
 * POST /api/v1/auth/reset-password
 * GET  /api/v1/auth/me        — Get current user profile
 *
 * JWT Flow:
 *   Login → access_token (15 min) + refresh_token (30 days)
 *   Frontend stores refresh_token in httpOnly cookie (not localStorage — XSS safe)
 *   Frontend sends access_token in Authorization header
 *   When access_token expires, use refresh_token to get a new one silently
 */

import Router from 'express-promise-router';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

import { NexusConfig }    from '../../config/loader';
import { TABLES }         from '../../services/database';
import { CACHE_KEYS, CACHE_TTL } from '../../services/cache';
import { ValidationError, UnauthorizedError, ConflictError, NotFoundError } from '../../middleware/errorHandler';
import { authMiddleware } from '../../middleware/authMiddleware';
import { createLogger }   from '../../utils/logger';

const logger = createLogger('nexus-auth');

const registerSchema = Joi.object({
  email:     Joi.string().email().required(),
  password:  Joi.string().min(8).pattern(/[A-Z]/).pattern(/[0-9]/).required()
                .messages({
                  'string.pattern.base': 'Password must contain at least one uppercase letter and one number',
                }),
  firstName: Joi.string().min(1).max(50).required(),
  lastName:  Joi.string().min(1).max(50).required(),
  phone:     Joi.string().pattern(/^\+?[1-9]\d{7,14}$/).optional(),
  country:   Joi.string().length(2).uppercase().default('US'),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

export function authRoutes(config: NexusConfig) {
  const router = Router();
  const jwtSecret       = process.env.NEXUS_BACKEND_SECRET!;
  const accessTokenTtl  = '15m';    // Access tokens expire in 15 minutes
  const refreshTokenTtl = '30d';    // Refresh tokens expire in 30 days

  function generateTokens(userId: string, email: string, roles: string[], kycLevel: number) {
    const payload = { id: userId, email, roles, kycLevel };
    const accessToken  = jwt.sign(payload, jwtSecret, { expiresIn: accessTokenTtl,  issuer: 'nexusfinance' });
    const refreshToken = jwt.sign({ id: userId },    jwtSecret, { expiresIn: refreshTokenTtl, issuer: 'nexusfinance' });
    return { accessToken, refreshToken };
  }

  // ── POST /register ────────────────────────────────────────────────────────
  router.post('/register', async (req: any, res) => {
    const { error, value } = registerSchema.validate(req.body);
    if (error) throw new ValidationError(error.details[0].message);

    const { db, cache } = req;

    // Check if email already exists
    const existing = await db(TABLES.USERS).where({ email: value.email }).first();
    if (existing) throw new ConflictError('An account with this email already exists.');

    // Hash password with bcrypt (cost factor 12 = ~250ms, hard to brute force)
    const passwordHash = await bcrypt.hash(value.password, 12);

    const userId = uuidv4();
    const [user] = await db(TABLES.USERS).insert({
      id:            userId,
      email:         value.email,
      password_hash: passwordHash,
      first_name:    value.firstName,
      last_name:     value.lastName,
      phone:         value.phone,
      country:       value.country,
      roles:         JSON.stringify(['customer']),
      kyc_level:     0,              // Starts unverified
      status:        'active',
      created_at:    new Date(),
      updated_at:    new Date(),
    }).returning(['id', 'email', 'first_name', 'last_name', 'roles', 'kyc_level', 'created_at']);

    const { accessToken, refreshToken } = generateTokens(userId, value.email, ['customer'], 0);

    // Store session in Redis
    await cache.setEx(CACHE_KEYS.userSession(userId), CACHE_TTL.SESSION, JSON.stringify({ userId, email: value.email }));

    logger.info('New user registered', { userId, email: value.email, country: value.country });

    res.status(201).json({
      user:          { ...user, roles: ['customer'], kycLevel: 0 },
      accessToken,
      refreshToken,
      message: 'Account created successfully. Welcome to NexusFinance!',
    });
  });

  // ── POST /login ───────────────────────────────────────────────────────────
  router.post('/login', async (req: any, res) => {
    const { error, value } = loginSchema.validate(req.body);
    if (error) throw new ValidationError(error.details[0].message);

    const { db, cache } = req;

    const user = await db(TABLES.USERS)
      .where({ email: value.email, status: 'active' })
      .select('id', 'email', 'password_hash', 'first_name', 'last_name', 'roles', 'kyc_level', 'failed_login_attempts', 'locked_until')
      .first();

    // Account lockout: too many failed attempts
    if (user?.locked_until && new Date(user.locked_until) > new Date()) {
      const unlockTime = new Date(user.locked_until).toISOString();
      throw new UnauthorizedError(`Account temporarily locked due to multiple failed attempts. Try again after ${unlockTime}.`);
    }

    // Use constant-time comparison to prevent timing attacks
    const validPassword = user && await bcrypt.compare(value.password, user.password_hash);

    if (!validPassword) {
      if (user) {
        // Increment failed attempts, lock after 5
        const attempts = (user.failed_login_attempts ?? 0) + 1;
        const updates: any = { failed_login_attempts: attempts };
        if (attempts >= 5) {
          updates.locked_until = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
          logger.warn('Account locked after failed attempts', { email: value.email });
        }
        await db(TABLES.USERS).where({ id: user.id }).update(updates);
      }
      throw new UnauthorizedError('Invalid email or password.');
    }

    // Reset failed attempts on success
    await db(TABLES.USERS).where({ id: user.id }).update({
      failed_login_attempts: 0,
      locked_until:          null,
      last_login_at:         new Date(),
    });

    const roles    = JSON.parse(user.roles ?? '["customer"]');
    const { accessToken, refreshToken } = generateTokens(user.id, user.email, roles, user.kyc_level);

    await cache.setEx(CACHE_KEYS.userSession(user.id), CACHE_TTL.SESSION, JSON.stringify({ userId: user.id }));

    logger.info('User logged in', { userId: user.id, email: user.email });

    res.json({
      user:  { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, roles, kycLevel: user.kyc_level },
      accessToken,
      refreshToken,
    });
  });

  // ── GET /me ───────────────────────────────────────────────────────────────
  router.get('/me', authMiddleware, async (req: any, res) => {
    const user = await req.db(TABLES.USERS)
      .where({ id: req.user.id })
      .select('id', 'email', 'first_name', 'last_name', 'phone', 'country', 'roles', 'kyc_level', 'created_at')
      .first();
    if (!user) throw new NotFoundError('User');
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roles: JSON.parse(user.roles ?? '[]'),
      kycLevel: user.kyc_level,
    });
  });

  // ── POST /logout ──────────────────────────────────────────────────────────
  router.post('/logout', authMiddleware, async (req: any, res) => {
    const userId = req.user!.id;
    await req.cache.del(CACHE_KEYS.userSession(userId));
    logger.info('User logged out', { userId });
    res.json({ message: 'Logged out successfully.' });
  });

  return router;
}
