import winston from 'winston';
import path from 'path';

const LOG_LEVEL     = process.env.LOG_LEVEL ?? 'info';
const IS_PRODUCTION = process.env.VV_ENVIRONMENT === 'production';

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

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export function createLogger(service: string): winston.Logger {
  const logsDir = path.resolve(process.cwd(), 'logs');

  return winston.createLogger({
    level: LOG_LEVEL,
    defaultMeta: {
      service,
      platform: 'vendorvault',
      version:  process.env.npm_package_version ?? '1.0.0',
      env:      process.env.VV_ENVIRONMENT ?? 'development',
    },
    format: IS_PRODUCTION ? prodFormat : devFormat,
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level:    'error',
        maxsize:  10 * 1024 * 1024,
        maxFiles: 5,
        tailable: true,
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize:  50 * 1024 * 1024,
        maxFiles: 10,
        tailable: true,
      }),
    ],
    exitOnError: false,
    silent: process.env.NODE_ENV === 'test',
  });
}
