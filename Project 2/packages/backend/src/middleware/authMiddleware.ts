import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import { CACHE_KEYS } from '../services/cache';
import { createLogger } from '../utils/logger';

const logger = createLogger('vv-auth-middleware');

export interface VVUser {
  id:        string;
  email:     string;
  name:      string;
  role:      'customer' | 'vendor' | 'admin';
  vendorId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?:      VVUser;
      requestId?: string;
    }
  }
}

export const authMiddleware: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }
    const token = authHeader.slice(7);

    const secret = process.env.VV_BACKEND_SECRET;
    if (!secret) throw new Error('JWT secret not configured');

    let decoded: VVUser & { iat: number; exp: number };
    try {
      decoded = jwt.verify(token, secret) as VVUser & { iat: number; exp: number };
    } catch (jwtErr) {
      if (jwtErr instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Session expired. Please sign in again.');
      }
      throw new UnauthorizedError('Invalid authentication token.');
    }

    // Check token revocation (logout/security events)
    const cache = (req as any).cache;
    if (cache) {
      const revoked = await cache.get(`vv:token:revoked:${token.slice(-12)}`);
      if (revoked) throw new UnauthorizedError('Token revoked. Please sign in again.');
    }

    req.user = {
      id:       decoded.id,
      email:    decoded.email,
      name:     decoded.name,
      role:     decoded.role,
      vendorId: decoded.vendorId,
    };

    logger.debug('Authenticated', { userId: req.user.id, role: req.user.role, path: req.path });
    next();
  } catch (error) {
    next(error);
  }
};

// ── RBAC helpers ──────────────────────────────────────────────────────────

export function requireRole(...roles: Array<'customer' | 'vendor' | 'admin'>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}

export function requireVendor(): RequestHandler {
  return requireRole('vendor', 'admin');
}

export function requireAdmin(): RequestHandler {
  return requireRole('admin');
}
