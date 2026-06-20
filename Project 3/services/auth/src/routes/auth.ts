import { Router, Request, Response } from 'express';
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { getDb } from '../services/database';
import { getCache, CACHE_KEYS, CACHE_TTL } from '../services/cache';
import { ValidationError, UnauthorizedError, ConflictError, RateLimitError, NotFoundError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { logger } from '../utils/logger';

const router = Router();

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(12).pattern(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/).required()
    .messages({ 'string.pattern.base': 'Password must contain uppercase, number, and special character' }),
  firstName: Joi.string().min(1).max(100).required(),
  lastName: Joi.string().min(1).max(100).required(),
  role: Joi.string().valid('patient', 'clinician', 'nurse').default('patient'),
  facilityId: Joi.string().uuid().optional(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{7,14}$/).optional(),
  dateOfBirth: Joi.string().isoDate().optional(),
  licenseNumber: Joi.when('role', {
    is: Joi.valid('clinician', 'nurse'),
    then: Joi.string().required(),
    otherwise: Joi.optional(),
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

router.post('/register', async (req: Request, res: Response) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) throw new ValidationError(error.details[0].message);

  const db = getDb();
  const existing = await db('mc_users').where({ email: value.email }).first();
  if (existing) throw new ConflictError('An account with this email already exists');

  const passwordHash = await bcrypt.hash(value.password, Number(process.env.MEDICORE_BCRYPT_ROUNDS) || 12);
  const userId = uuidv4();

  await db('mc_users').insert({
    id: userId,
    email: value.email,
    password_hash: passwordHash,
    first_name: value.firstName,
    last_name: value.lastName,
    role: value.role,
    facility_id: value.facilityId || null,
    phone: value.phone || null,
    date_of_birth: value.dateOfBirth || null,
    license_number: value.licenseNumber || null,
    status: 'active',
    email_verified: false,
    mfa_enabled: false,
    created_at: new Date(),
    updated_at: new Date(),
  });

  await db('mc_audit_logs').insert({
    id: uuidv4(),
    actor_id: userId,
    action: 'USER_REGISTERED',
    entity_type: 'user',
    entity_id: userId,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'] || '',
    created_at: new Date(),
  });

  logger.info('New user registered', { userId, email: value.email, role: value.role });

  res.status(201).json({
    message: 'Account created successfully. Please verify your email.',
    userId,
  });
});

router.post('/login', async (req: Request, res: Response) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) throw new ValidationError(error.details[0].message);

  const db = getDb();

  let cache: ReturnType<typeof getCache> | null = null;
  try { cache = getCache(); } catch { /* Redis unavailable — skip rate limiting and session cache */ }

  if (cache) {
    const limiter = new RateLimiterRedis({
      storeClient: cache,
      keyPrefix: 'mc:login:limit',
      points: 5,
      duration: 60,
      blockDuration: 120,
    });
    try {
      await limiter.consume(value.email);
    } catch {
      throw new RateLimitError();
    }
  }

  const user = await db('mc_users').where({ email: value.email }).first();
  if (!user) throw new UnauthorizedError('Invalid email or password');
  if (user.status === 'locked') throw new UnauthorizedError('Account is locked. Contact support.');
  if (user.status === 'inactive') throw new UnauthorizedError('Account is deactivated');

  const passwordValid = await bcrypt.compare(value.password, user.password_hash);
  if (!passwordValid) {
    await db('mc_users').where({ id: user.id }).increment('failed_login_attempts', 1);
    if (user.failed_login_attempts + 1 >= 5) {
      await db('mc_users').where({ id: user.id }).update({ status: 'locked', locked_until: new Date(Date.now() + 30 * 60 * 1000) });
    }
    throw new UnauthorizedError('Invalid email or password');
  }

  await db('mc_users').where({ id: user.id }).update({ failed_login_attempts: 0, last_login_at: new Date() });

  const jwtSecret = process.env.MEDICORE_JWT_SECRET || 'medicore_jwt_super_secret_key_2025_dev';
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, facilityId: user.facility_id, mfaVerified: !user.mfa_enabled },
    jwtSecret,
    { expiresIn: (process.env.MEDICORE_JWT_EXPIRY || '15m') as string, algorithm: 'HS256' }
  );
  const refreshToken = jwt.sign(
    { sub: user.id, type: 'refresh' },
    jwtSecret,
    { expiresIn: (process.env.MEDICORE_REFRESH_TOKEN_EXPIRY || '30d') as string, algorithm: 'HS256' }
  );

  if (cache) {
    try {
      await cache.setex(CACHE_KEYS.session(user.id), CACHE_TTL.session, JSON.stringify({ userId: user.id, role: user.role }));
    } catch { /* non-fatal */ }
  }

  try {
    await db('mc_audit_logs').insert({
      id: uuidv4(),
      actor_id: user.id,
      action: 'USER_LOGIN',
      entity_type: 'user',
      entity_id: user.id,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || '',
      created_at: new Date(),
    });
  } catch { /* non-fatal audit log failure */ }

  res.json({
    user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role, mfaEnabled: user.mfa_enabled },
    accessToken,
    refreshToken,
    mfaRequired: user.mfa_enabled,
  });
});

router.post('/logout', authenticate, async (req: Request, res: Response) => {
  const token = req.headers.authorization!.slice(7);
  try {
    const cache = getCache();
    await cache.setex(CACHE_KEYS.revokedToken(token.slice(-12)), CACHE_TTL.revokedToken, '1');
    await cache.del(CACHE_KEYS.session(req.user!.sub));
  } catch { /* Redis unavailable — logout still succeeds */ }
  res.json({ message: 'Logged out successfully' });
});

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ValidationError('Refresh token required');

  const jwtSecret = process.env.MEDICORE_JWT_SECRET || 'medicore_jwt_super_secret_key_2025_dev';
  let payload: { sub: string; type: string };
  try {
    payload = jwt.verify(refreshToken, jwtSecret) as typeof payload;
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }
  if (payload.type !== 'refresh') throw new UnauthorizedError('Invalid token type');

  const db = getDb();
  const user = await db('mc_users').where({ id: payload.sub }).first();
  if (!user || user.status !== 'active') throw new UnauthorizedError('User not found or inactive');

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, facilityId: user.facility_id, mfaVerified: !user.mfa_enabled },
    jwtSecret,
    { expiresIn: process.env.MEDICORE_JWT_EXPIRY || '15m', algorithm: 'HS256' }
  );

  res.json({ accessToken });
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  const db = getDb();
  const user = await db('mc_users').where({ id: req.user!.sub }).select('id', 'email', 'first_name', 'last_name', 'role', 'facility_id', 'phone', 'mfa_enabled', 'last_login_at', 'created_at').first();
  if (!user) throw new NotFoundError('User');
  res.json({ user });
});

router.get('/users', authenticate, requireRole('admin', 'superadmin'), async (_req: Request, res: Response) => {
  const db = getDb();
  const users = await db('mc_users').select('id', 'email', 'first_name', 'last_name', 'role', 'status', 'facility_id', 'last_login_at', 'created_at').orderBy('created_at', 'desc');
  res.json({ users, total: users.length });
});

export default router;
