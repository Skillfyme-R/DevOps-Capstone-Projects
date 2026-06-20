import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('vv-error-handler');

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError   extends AppError { constructor(msg = 'Validation error')    { super(400, msg, 'VALIDATION_ERROR') } }
export class UnauthorizedError  extends AppError { constructor(msg = 'Unauthorized')         { super(401, msg, 'UNAUTHORIZED') } }
export class ForbiddenError     extends AppError { constructor(msg = 'Forbidden')             { super(403, msg, 'FORBIDDEN') } }
export class NotFoundError      extends AppError { constructor(msg = 'Not found')             { super(404, msg, 'NOT_FOUND') } }
export class ConflictError      extends AppError { constructor(msg = 'Conflict')              { super(409, msg, 'CONFLICT') } }
export class BusinessRuleError  extends AppError { constructor(msg = 'Business rule violated') { super(422, msg, 'BUSINESS_RULE_ERROR') } }
export class RateLimitError     extends AppError { constructor(msg = 'Too many requests')     { super(429, msg, 'RATE_LIMIT_EXCEEDED') } }

export function errorHandler() {
  return (err: Error, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      if (err.statusCode >= 500) {
        logger.error(err.message, { code: err.code, path: req.path, stack: err.stack });
      }
      return res.status(err.statusCode).json({
        error: {
          code:      err.code ?? 'APP_ERROR',
          message:   err.message,
          requestId: (req as any).requestId,
        },
      });
    }

    // Knex duplicate key violations
    if ((err as any).code === '23505') {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'Record already exists.' } });
    }

    logger.error('Unhandled error', { message: err.message, stack: err.stack, path: req.path });
    res.status(500).json({
      error: {
        code:      'INTERNAL_ERROR',
        message:   'An unexpected error occurred.',
        requestId: (req as any).requestId,
      },
    });
  };
}
