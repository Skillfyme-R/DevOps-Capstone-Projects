/**
 * VendorVault Auth API
 *
 * POST /api/v1/auth/register    — Create account (customer or vendor)
 * POST /api/v1/auth/login       — Email + password login → JWT
 * POST /api/v1/auth/logout      — Revoke current token
 * GET  /api/v1/auth/me          — Current user info
 * POST /api/v1/auth/refresh     — Refresh JWT
 * POST /api/v1/auth/forgot      — Send password reset email
 * POST /api/v1/auth/reset       — Reset password with token
 */

import Router from 'express-promise-router';
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { TABLES } from '../../services/database';
import { CACHE_KEYS, CACHE_TTL } from '../../services/cache';
import { ValidationError, UnauthorizedError, ConflictError, NotFoundError } from '../../middleware/errorHandler';
import { authMiddleware } from '../../middleware/authMiddleware';
import { createLogger } from '../../utils/logger';
import { VVConfig } from '../../config/loader';

const logger = createLogger('vv-auth');

const registerSchema = Joi.object({
  name:      Joi.string().min(2).max(100).required(),
  email:     Joi.string().email().required(),
  password:  Joi.string().min(8).max(128).required(),
  role:      Joi.string().valid('customer', 'vendor').default('customer'),
  storeName: Joi.when('role', { is: 'vendor', then: Joi.string().min(2).max(100).required() }),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

function signJwt(payload: object, secret: string, expiresIn = '7d'): string {
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

export function authRoutes(config: VVConfig) {
  const router = Router();
  const secret = process.env.VV_BACKEND_SECRET ?? 'dev-secret';

  // POST /register
  router.post('/register', async (req: any, res) => {
    const { error, value } = registerSchema.validate(req.body);
    if (error) throw new ValidationError(error.details[0].message);

    const { name, email, password, role, storeName } = value;
    const db = req.db;

    const existing = await db(TABLES.USERS).where({ email }).first();
    if (existing) throw new ConflictError('An account with this email already exists.');

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    await db(TABLES.USERS).insert({
      id:            userId,
      name,
      email,
      password_hash: passwordHash,
      role,
      is_active:     true,
      created_at:    new Date(),
      updated_at:    new Date(),
    });

    if (role === 'vendor') {
      const vendorId = uuidv4();
      await db(TABLES.VENDORS).insert({
        id:          vendorId,
        user_id:     userId,
        store_name:  storeName,
        is_verified: false,
        commission_rate: 0.12,
        payout_delay_days: 7,
        created_at:  new Date(),
        updated_at:  new Date(),
      });
    }

    const token = signJwt({ id: userId, email, name, role }, secret);
    logger.info('User registered', { userId, role });
    res.status(201).json({ token, user: { id: userId, name, email, role } });
  });

  // POST /login
  router.post('/login', async (req: any, res) => {
    const { error, value } = loginSchema.validate(req.body);
    if (error) throw new ValidationError(error.details[0].message);

    const { email, password } = value;
    const db = req.db;

    const user = await db(TABLES.USERS).where({ email, is_active: true }).first();
    if (!user) throw new UnauthorizedError('Invalid email or password.');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedError('Invalid email or password.');

    let vendorId: string | undefined;
    if (user.role === 'vendor') {
      const vendor = await db(TABLES.VENDORS).where({ user_id: user.id }).first();
      vendorId = vendor?.id;
    }

    const token = signJwt({ id: user.id, email: user.email, name: user.name, role: user.role, vendorId }, secret);

    const cache = req.cache;
    if (cache) {
      await cache.setEx(CACHE_KEYS.userSession(user.id), CACHE_TTL.SESSION, token);
    }

    await db(TABLES.AUDIT_LOGS).insert({
      id: uuidv4(), entity_type: 'user', entity_id: user.id, action: 'login',
      actor_id: user.id, ip_address: req.ip, created_at: new Date(),
    });

    logger.info('User logged in', { userId: user.id, role: user.role });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, vendorId } });
  });

  // POST /logout
  router.post('/logout', authMiddleware, async (req: any, res) => {
    const token = req.headers.authorization?.slice(7);
    if (token && req.cache) {
      await req.cache.setEx(`vv:token:revoked:${token.slice(-12)}`, 86_400, '1');
      await req.cache.del(CACHE_KEYS.userSession(req.user.id));
    }
    logger.info('User logged out', { userId: req.user?.id });
    res.json({ message: 'Logged out successfully.' });
  });

  // GET /me
  router.get('/me', authMiddleware, async (req: any, res) => {
    const user = await req.db(TABLES.USERS).where({ id: req.user.id }).first();
    if (!user) throw new NotFoundError('User not found.');
    const { password_hash: _, ...safe } = user;
    res.json({ user: safe });
  });

  return router;
}
