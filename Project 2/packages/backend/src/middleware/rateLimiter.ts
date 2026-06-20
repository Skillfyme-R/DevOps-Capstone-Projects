import { Request, Response, NextFunction, RequestHandler } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { RateLimitError } from './errorHandler';

export function rateLimitMiddleware(cache: any): RequestHandler {
  const limiter = new RateLimiterRedis({
    storeClient:   cache,
    keyPrefix:     'vv:rate:api',
    points:        120,    // 120 requests
    duration:      60,     // per 60 seconds
    blockDuration: 60,     // Block for 60s when limit exceeded
  });

  return async (req: Request, _res: Response, next: NextFunction) => {
    const key = req.user ? `user:${(req as any).user?.id}` : `ip:${req.ip}`;
    try {
      await limiter.consume(key);
      next();
    } catch {
      next(new RateLimitError('Rate limit exceeded. Please slow down.'));
    }
  };
}
