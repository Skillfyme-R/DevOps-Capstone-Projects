import winston from 'winston';

const isDev = (process.env.MEDICORE_ENVIRONMENT || 'development') === 'development';

export const logger = winston.createLogger({
  level: process.env.MEDICORE_LOG_LEVEL || 'info',
  format: isDev
    ? winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [AUTH] ${level}: ${message}${metaStr}`;
        })
      )
    : winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
  defaultMeta: { service: 'medicore-auth', platform: 'medicore' },
  transports: [new winston.transports.Console()],
});
