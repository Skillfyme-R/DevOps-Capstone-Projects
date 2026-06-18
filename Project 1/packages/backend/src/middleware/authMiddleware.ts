/**
 * NexusFinance JWT Authentication Middleware
 *
 * Protects routes that require a logged-in user.
 * Flow:
 *   1. Client sends:  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 *   2. We extract the JWT from the header
 *   3. Verify the signature using our secret key
 *   4. Check the token hasn't expired
 *   5. Check the token hasn't been revoked (check Redis blacklist)
 *   6. Attach the decoded user to req.user
 *   7. Call next() to continue to the actual route handler
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from './errorHandler';
import { CACHE_KEYS } from '../services/cache';
import { createLogger } from '../utils/logger';

const logger = createLogger('nexus-auth-middleware');

export interface NexusUser {
  id:       string;
  email:    string;
  roles:    string[];    // ['customer', 'analyst', 'admin']
  kycLevel: number;     // 0=none, 1=basic, 2=verified, 3=enhanced
}

// Extend Express Request type to include our user
declare global {
  namespace Express {
    interface Request {
      user?: NexusUser;
      requestId?: string;
    }
  }
}

export const authMiddleware: RequestHandler = async (
  req: Request,
  _res: Response,
  next:  NextFunction
): Promise<void> => {
  try {
    // ── Step 1: Extract the token from the Authorization header ────────────
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header. Expected: Bearer <token>');
    }
    const token = authHeader.slice(7); // Remove "Bearer " prefix

    // ── Step 2: Verify and decode the JWT ─────────────────────────────────
    const secret = process.env.NEXUS_BACKEND_SECRET;
    if (!secret) throw new Error('JWT secret not configured');

    let decoded: NexusUser & { iat: number; exp: number };
    try {
      decoded = jwt.verify(token, secret) as NexusUser & { iat: number; exp: number };
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Your session has expired. Please log in again.');
      }
      throw new UnauthorizedError('Invalid authentication token.');
    }

    // ── Step 3: Check if token has been revoked (logout/security events) ──
    const cache = (req as any).cache;
    if (cache) {
      const blacklisted = await cache.get(`nexus:token:blacklist:${token.slice(-10)}`);
      if (blacklisted) {
        throw new UnauthorizedError('Token has been revoked. Please log in again.');
      }
    }

    // ── Step 4: Attach user to request ────────────────────────────────────
    req.user = {
      id:       decoded.id,
      email:    decoded.email,
      roles:    decoded.roles,
      kycLevel: decoded.kycLevel,
    };

    logger.debug('Authenticated request', { userId: req.user.id, path: req.path });
    next();
  } catch (error) {
    next(error); // Pass to error handler
  }
};

// ── Role-Based Access Control Helper ───────────────────────────────────────
// Usage: router.get('/admin/reports', requireRole('admin'), handler)
export function requireRole(...roles: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    const hasRole = roles.some(role => req.user!.roles.includes(role));
    if (!hasRole) {
      return next(new Error(`Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}

// ── KYC Level Guard ────────────────────────────────────────────────────────
// In FinTech, users must verify their identity before certain actions.
// Usage: router.post('/wire-transfer', requireKyc(2), handler)
export function requireKyc(minLevel: number): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (req.user.kycLevel < minLevel) {
      return next(new Error(
        `This action requires KYC Level ${minLevel}. Your level: ${req.user.kycLevel}. ` +
        `Please complete identity verification.`
      ));
    }
    next();
  };
}
