import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import { getCache, CACHE_KEYS } from '../services/cache';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'patient' | 'clinician' | 'nurse' | 'admin' | 'superadmin';
  facilityId?: string;
  mfaVerified: boolean;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request { user?: JwtPayload; }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new UnauthorizedError();

  const token = header.slice(7);
  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, process.env.MEDICORE_JWT_SECRET || 'medicore_jwt_super_secret_key_2025_dev') as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }

  try {
    const cache = getCache();
    const suffix = token.slice(-12);
    const revoked = await cache.get(CACHE_KEYS.revokedToken(suffix));
    if (revoked) throw new UnauthorizedError('Token has been revoked');
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    /* Redis unavailable — skip revocation check */
  }

  req.user = payload;
  next();
}

export function requireRole(...roles: JwtPayload['role'][]) {
  return (_req: Request, _res: Response, next: NextFunction) => {
    if (!_req.user) throw new UnauthorizedError();
    if (!roles.includes(_req.user.role)) throw new ForbiddenError(`Role ${_req.user.role} cannot access this resource`);
    next();
  };
}

export function requireMfa(_req: Request, _res: Response, next: NextFunction) {
  if (!_req.user?.mfaVerified) throw new ForbiddenError('MFA verification required');
  next();
}
