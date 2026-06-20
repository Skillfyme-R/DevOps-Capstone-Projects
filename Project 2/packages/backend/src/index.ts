/**
 * VendorVault Backend — Main Server Entry Point
 *
 * Startup sequence:
 *  1. Load YAML + env var configuration
 *  2. Connect to PostgreSQL
 *  3. Connect to Redis
 *  4. Initialize Sentry (error tracking)
 *  5. Build Express application with security middleware
 *  6. Register all API route plugins
 *  7. Start HTTP server
 *  8. Register graceful shutdown hooks
 */

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import './tracer'; // Datadog APM — must be first

import express, { Express } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import { json as jsonParser } from 'express';
import * as Sentry from '@sentry/node';

import { loadConfig }          from './config/loader';
import { createDatabase }      from './services/database';
import { createCache }         from './services/cache';
import { createLogger }        from './utils/logger';
import { requestIdMiddleware } from './middleware/requestId';
import { rateLimitMiddleware } from './middleware/rateLimiter';
import { metricsMiddleware, metricsRoute } from './middleware/metrics';
import { errorHandler }        from './middleware/errorHandler';
import { authMiddleware }      from './middleware/authMiddleware';

// Route Plugins
import { healthRoutes }    from './plugins/health/routes';
import { authRoutes }      from './plugins/auth/routes';
import { catalogRoutes }   from './plugins/catalog/routes';
import { cartRoutes }      from './plugins/cart/routes';
import { ordersRoutes }    from './plugins/orders/routes';
import { vendorsRoutes }   from './plugins/vendors/routes';
import { paymentsRoutes }  from './plugins/payments/routes';
import { analyticsRoutes } from './plugins/analytics/routes';
import { wishlistRoutes }  from './plugins/wishlist/routes';
import { auditRoutes }     from './plugins/audit/routes';

const logger = createLogger('vv-server');

async function bootstrap(): Promise<void> {
  const config = await loadConfig();
  const env    = config.vendorvault?.platform?.environment ?? 'development';
  logger.info(`Starting VendorVault Backend [${env}]`);

  Sentry.init({
    dsn:              config.integrations?.sentry?.dsn,
    environment:      env,
    tracesSampleRate: env === 'production' ? 0.1 : 1.0,
  });

  const db    = await createDatabase(config);
  const cache = await createCache(config);

  const app: Express = express();

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'"],
        styleSrc:   ["'self'", 'https://fonts.googleapis.com'],
        fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
        imgSrc:     ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'", 'https://api.vendorvault.io'],
      },
    },
    hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
  }));

  app.use(cors({
    origin: [
      'http://localhost:3000',
      'https://app.vendorvault.io',
      config.backend?.cors?.origin,
    ].filter(Boolean) as string[],
    credentials: true,
    methods: ['GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'DELETE'],
  }));

  app.use(compression());
  app.use(jsonParser({ limit: '10mb' }));
  app.use(morgan('combined'));
  app.use(requestIdMiddleware());
  app.use(metricsMiddleware());
  app.use(rateLimitMiddleware(cache));

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  // Inject shared services into every request
  app.use((req: any, _res, next) => {
    req.db     = db;
    req.cache  = cache;
    req.config = config;
    next();
  });

  // ── API Routes ────────────────────────────────────────────────────────────
  app.use('/healthz',                   healthRoutes());
  app.use('/metrics',                   metricsRoute());
  app.use('/api/v1/auth',               authRoutes(config));
  app.use('/api/v1/catalog',            catalogRoutes());
  app.use('/api/v1/vendors',            vendorsRoutes());
  app.use('/api/v1/cart',               authMiddleware, cartRoutes());
  app.use('/api/v1/orders',             authMiddleware, ordersRoutes(config));
  app.use('/api/v1/payments',           authMiddleware, paymentsRoutes(config));
  app.use('/api/v1/analytics',          authMiddleware, analyticsRoutes());
  app.use('/api/v1/wishlist',           authMiddleware, wishlistRoutes());
  app.use('/api/v1/audit',              authMiddleware, auditRoutes());

  app.use(Sentry.Handlers.errorHandler());
  app.use(errorHandler());

  const port = process.env.PORT ? parseInt(process.env.PORT) : (config.backend?.listen?.port ?? 8008);
  const host = config.backend?.listen?.host ?? '0.0.0.0';

  const server = app.listen(port, host, () => {
    logger.info(`VendorVault API listening on http://${host}:${port}`);
    logger.info(`Environment: ${env}`);
    logger.info(`Database:    ${config.backend?.database?.connection?.database}`);
    logger.info(`Health:      http://${host}:${port}/healthz`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal} — graceful shutdown`);
    server.close(async () => {
      await db.destroy();
      await cache.quit();
      logger.info('Shutdown complete.');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 30_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('FATAL: Failed to start VendorVault backend:', err);
  process.exit(1);
});
