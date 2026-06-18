/**
 * NexusFinance Logger
 *
 * Uses Winston for structured logging.
 * "Structured" means logs are JSON objects, not just strings.
 *
 * Bad log:  "User 123 transferred $500"
 * Good log: { "level": "info", "service": "payments", "userId": "123", "amount": 500,
 *             "currency": "USD", "timestamp": "2024-01-15T10:30:00Z" }
 *
 * JSON logs can be searched, filtered, and aggregated in Datadog/CloudWatch.
 * String logs cannot.
 */

import winston from 'winston';
import path from 'path';

const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';
const IS_PRODUCTION = process.env.NEXUS_ENVIRONMENT === 'production';

// ── Custom Log Format ───────────────────────────────────────────────────────

// In development: colored, human-readable output
const devFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0
      ? `\n    ${JSON.stringify(meta, null, 2)}`
      : '';
    return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
  })
);

// In production: JSON (easily parsed by log aggregators)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),  // Include stack traces
  winston.format.json()
);

export function createLogger(service: string): winston.Logger {
  // Ensure logs directory exists
  const logsDir = path.resolve(process.cwd(), 'logs');

  return winston.createLogger({
    level: LOG_LEVEL,
    defaultMeta: {
      service,
      platform: 'nexusfinance',
      version:  process.env.npm_package_version ?? '1.0.0',
      env:      process.env.NEXUS_ENVIRONMENT   ?? 'development',
    },
    format: IS_PRODUCTION ? prodFormat : devFormat,
    transports: [
      // Always log to console (for container environments like Docker/K8s)
      new winston.transports.Console(),

      // Log errors to a separate file (easy to check what went wrong)
      new winston.transports.File({
        filename:  path.join(logsDir, 'error.log'),
        level:    'error',
        maxsize:   10 * 1024 * 1024,  // Rotate at 10MB
        maxFiles:  5,                  // Keep last 5 files
        tailable:  true,
      }),

      // All logs (for full audit trail — important in FinTech)
      new winston.transports.File({
        filename:  path.join(logsDir, 'combined.log'),
        maxsize:   50 * 1024 * 1024,  // Rotate at 50MB
        maxFiles:  10,
        tailable:  true,
      }),
    ],
    // Don't crash the app if logging fails
    exitOnError: false,
    silent: process.env.NODE_ENV === 'test',  // No log output during tests
  });
}
