/**
 * NexusFinance Error Handler
 *
 * In Express, a function with 4 parameters (err, req, res, next)
 * is automatically treated as an error handler.
 *
 * All errors thrown anywhere in the app flow here.
 * We return consistent JSON error responses so the frontend
 * always knows what to expect.
 *
 * Error response format:
 * {
 *   "error": {
 *     "code": "INSUFFICIENT_FUNDS",
 *     "message": "Account balance is $200.00, transaction requires $500.00",
 *     "details": { "balance": 200.00, "required": 500.00 },
 *     "requestId": "b3f2a8c1-...",
 *     "timestamp": "2024-01-15T10:30:00Z"
 *   }
 * }
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('nexus-error-handler');

// ── Custom Error Classes ────────────────────────────────────────────────────
// By throwing these specific classes, routes communicate what went wrong
// without the error handler needing to guess.

export class NexusError extends Error {
  constructor(
    public readonly statusCode: number,   // HTTP status code to return
    public readonly code:       string,   // Machine-readable error code
    message:                    string,   // Human-readable message
    public readonly details?:   Record<string, unknown>  // Extra context
  ) {
    super(message);
    this.name = 'NexusError';
    // Restore prototype chain (needed for instanceof checks with TypeScript)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// 400 — Client sent invalid data
export class ValidationError extends NexusError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

// 401 — Not logged in
export class UnauthorizedError extends NexusError {
  constructor(message = 'Authentication required. Please log in.') {
    super(401, 'UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

// 403 — Logged in but not allowed
export class ForbiddenError extends NexusError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

// 404 — Resource doesn't exist
export class NotFoundError extends NexusError {
  constructor(resource: string, id?: string) {
    super(404, 'NOT_FOUND', id ? `${resource} '${id}' not found.` : `${resource} not found.`);
    this.name = 'NotFoundError';
  }
}

// 409 — Conflict with current state
export class ConflictError extends NexusError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
    this.name = 'ConflictError';
  }
}

// 422 — Business rule violation (enough balance check, etc.)
export class BusinessRuleError extends NexusError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(422, 'BUSINESS_RULE_VIOLATION', message, details);
    this.name = 'BusinessRuleError';
  }
}

// 429 — Too many requests
export class RateLimitError extends NexusError {
  constructor(retryAfterSeconds: number) {
    super(429, 'RATE_LIMIT_EXCEEDED', `Too many requests. Try again in ${retryAfterSeconds} seconds.`, { retryAfterSeconds });
    this.name = 'RateLimitError';
  }
}

// 451 — Legal/compliance block (AML, sanctions screening)
export class ComplianceError extends NexusError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(451, 'COMPLIANCE_BLOCK', message, details);
    this.name = 'ComplianceError';
  }
}

// ── Error Handler Middleware ────────────────────────────────────────────────

export function errorHandler(): ErrorRequestHandler {
  return (err: Error, req: Request, res: Response, _next: NextFunction) => {
    const requestId  = (req as any).requestId ?? 'unknown';
    const timestamp  = new Date().toISOString();

    if (err instanceof NexusError) {
      // Known business error — log as warning (not an unexpected bug)
      logger.warn('Request failed with business error', {
        code:       err.code,
        statusCode: err.statusCode,
        message:    err.message,
        path:       req.path,
        method:     req.method,
        requestId,
      });

      return res.status(err.statusCode).json({
        error: {
          code:      err.code,
          message:   err.message,
          details:   err.details,
          requestId,
          timestamp,
        },
      });
    }

    // Unknown/unexpected error — log as error with full stack trace
    logger.error('Unhandled server error', {
      message:   err.message,
      stack:     err.stack,
      path:      req.path,
      method:    req.method,
      requestId,
    });

    return res.status(500).json({
      error: {
        code:      'INTERNAL_SERVER_ERROR',
        message:   'An unexpected error occurred. Our engineering team has been notified.',
        requestId,
        timestamp,
      },
    });
  };
}
