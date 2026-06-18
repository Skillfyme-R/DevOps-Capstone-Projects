/**
 * NexusFinance Rate Limiter
 *
 * Prevents abuse of the API:
 *   - Brute force login attempts (an attacker tries 10,000 passwords)
 *   - Payment flooding (programmatically sending thousands of transactions)
 *   - Data scraping (downloading all customer data)
 *
 * Uses Redis so limits are shared across all backend instances.
 * (Without Redis, each pod would have its own counter and limits would be ineffective.)
 *
 * Different routes have different limits based on their risk level:
 *   - /auth/login:     5 attempts per minute (brute force protection)
 *   - /payments:      10 per minute (prevent payment fraud)
 *   - /transactions:  30 per minute (normal banking usage)
 *   - Everything else: 100 per minute (general API usage)
 */

import { RequestHandler, Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { Cache } from '../services/cache';
import { createLogger } from '../utils/logger';

const logger = createLogger('nexus-rate-limiter');

// Route-specific limits (requests per minute)
const ROUTE_LIMITS: Array<{ pattern: RegExp; points: number; label: string }> = [
  { pattern: /^\/api\/v1\/auth\/login/,    points: 5,   label: 'auth-login'    },
  { pattern: /^\/api\/v1\/auth/,           points: 15,  label: 'auth'          },
  { pattern: /^\/api\/v1\/payments/,       points: 10,  label: 'payments'      },
  { pattern: /^\/api\/v1\/transactions/,   points: 30,  label: 'transactions'  },
  { pattern: /^\/api\/v1\/analytics/,      points: 20,  label: 'analytics'     },
];
const DEFAULT_POINTS = 100;

function getLimitForPath(path: string): { points: number; label: string } {
  for (const rule of ROUTE_LIMITS) {
    if (rule.pattern.test(path)) {
      return { points: rule.points, label: rule.label };
    }
  }
  return { points: DEFAULT_POINTS, label: 'general' };
}

export function rateLimitMiddleware(cache: Cache): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { points, label } = getLimitForPath(req.path);
    const ip = req.ip ?? 'unknown';
    const key = `${label}:${ip}`;

    const limiter = new RateLimiterRedis({
      storeClient:    cache,
      keyPrefix:      'nexus:rl',
      points,            // Number of requests allowed
      duration:       60, // Per 60 seconds (1 minute)
      blockDuration:  120, // Block for 2 minutes after exceeding limit
    });

    try {
      const rateLimiterRes: RateLimiterRes = await limiter.consume(key);

      // Tell the client how many requests they have left
      res.setHeader('X-RateLimit-Limit',     points);
      res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
      res.setHeader('X-RateLimit-Reset',     new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());

      next();
    } catch (rateLimiterRes) {
      const retryAfter = Math.ceil((rateLimiterRes as RateLimiterRes).msBeforeNext / 1000);

      logger.warn('Rate limit exceeded', { ip, path: req.path, label });

      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        error: {
          code:           'RATE_LIMIT_EXCEEDED',
          message:        `Too many requests to ${label} endpoints. Please wait ${retryAfter} seconds.`,
          retryAfterSeconds: retryAfter,
        },
      });
    }
  };
}
