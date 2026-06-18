/**
 * NexusFinance Backend — Main Server
 *
 * Startup sequence:
 *  1. Load config from YAML + env vars
 *  2. Connect to PostgreSQL database
 *  3. Connect to Redis cache
 *  4. Initialize Sentry error tracking
 *  5. Build Express app with all middleware
 *  6. Register all API route plugins
 *  7. Start HTTP server
 *  8. Register graceful shutdown hooks
 */

import path from 'path';
import dotenv from 'dotenv';
// Load .env from project root before anything else so all ${VAR} placeholders resolve
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import './tracer';                       // Datadog APM — MUST be imported first, before anything else

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
import { healthRoutes }       from './plugins/health/routes';
import { authRoutes }         from './plugins/auth/routes';
import { accountRoutes }      from './plugins/accounts/routes';
import { transactionRoutes }  from './plugins/transactions/routes';
import { loanRoutes }         from './plugins/loans/routes';
import { paymentRoutes }      from './plugins/payments/routes';
import { analyticsRoutes }    from './plugins/analytics/routes';
import { auditRoutes }        from './plugins/audit/routes';

const logger = createLogger('nexus-server');

async function bootstrap(): Promise<void> {
  // ── 1. Load configuration ────────────────────────────────────────────────
  const config = await loadConfig();
  const env = config.nexusfinance?.platform?.environment ?? 'development';
  logger.info(`Starting NexusFinance Backend [${env}]`);

  // ── 2. Initialize Sentry (error tracking) ────────────────────────────────
  Sentry.init({
    dsn: config.integrations?.sentry?.dsn,
    environment: env,
    tracesSampleRate: env === 'production' ? 0.1 : 1.0,
  });

  // ── 3. Connect to PostgreSQL ──────────────────────────────────────────────
  const db = await createDatabase(config);

  // ── 4. Connect to Redis ───────────────────────────────────────────────────
  const cache = await createCache(config);

  // ── 5. Build Express Application ─────────────────────────────────────────
  const app: Express = express();

  // Security: Set HTTP headers that protect against common web attacks
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'"],
        styleSrc:    ["'self'", 'https://fonts.googleapis.com'],
        fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
        imgSrc:      ["'self'", 'data:', 'https://nexusfinance.io'],
        connectSrc:  ["'self'", 'https://api.nexusfinance.io'],
      },
    },
    // Tell browsers to only use HTTPS for 1 year
    hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
  }));

  // Allow requests from the frontend origin
  app.use(cors({
    origin:      ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003', config.backend?.cors?.origin].filter(Boolean) as string[],
    credentials: true,
    methods:     ['GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'DELETE'],
  }));

  app.use(compression());           // Compress all responses with gzip
  app.use(jsonParser({ limit: '10mb' })); // Parse JSON request bodies
  app.use(morgan('combined'));       // Log every HTTP request
  app.use(requestIdMiddleware());    // Attach unique ID to every request (for tracing)
  app.use(metricsMiddleware());      // Measure request duration for Prometheus
  app.use(rateLimitMiddleware(cache)); // Rate limit using Redis

  // Sentry middleware: must come before routes
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  // Inject db and cache into every request so routes can use them
  app.use((req: any, _res, next) => {
    req.db     = db;
    req.cache  = cache;
    req.config = config;
    next();
  });

  // ── 6. Register API Routes ────────────────────────────────────────────────
  app.use('/healthz',                healthRoutes());         // Health checks
  app.use('/metrics',                metricsRoute());         // Prometheus scrape endpoint
  app.use('/api/v1/auth',            authRoutes(config));     // Login / OAuth / JWT refresh
  app.use('/api/v1/accounts',        authMiddleware, accountRoutes());      // Bank accounts
  app.use('/api/v1/transactions',    authMiddleware, transactionRoutes());   // Money movements
  app.use('/api/v1/loans',           authMiddleware, loanRoutes());          // Loan applications
  app.use('/api/v1/payments',        authMiddleware, paymentRoutes());       // Send/receive money
  app.use('/api/v1/analytics',       authMiddleware, analyticsRoutes());     // Financial dashboards
  app.use('/api/v1/audit',           authMiddleware, auditRoutes());         // Audit trail

  // Error handlers — must come AFTER all routes
  app.use(Sentry.Handlers.errorHandler());
  app.use(errorHandler());

  // ── 7. Start HTTP Server ──────────────────────────────────────────────────
  const port = process.env.PORT ? parseInt(process.env.PORT) : (config.backend?.listen?.port ?? 7007);
  const host = config.backend?.listen?.host ?? '0.0.0.0';

  const server = app.listen(port, host, () => {
    logger.info(`✓ NexusFinance API listening on http://${host}:${port}`);
    logger.info(`✓ Environment: ${env}`);
    logger.info(`✓ Database: ${config.backend?.database?.connection?.database}`);
    logger.info(`✓ Docs: http://${host}:${port}/healthz`);
  });

  // ── 8. Graceful Shutdown ──────────────────────────────────────────────────
  // When Kubernetes sends SIGTERM (during pod restart), finish current requests,
  // close DB connections, then exit cleanly — don't drop requests mid-flight.
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal} — beginning graceful shutdown`);
    server.close(async () => {
      await db.destroy();          // Close all database connections
      await cache.quit();          // Close Redis connection
      logger.info('Shutdown complete. Goodbye.');
      process.exit(0);
    });
    // Force shutdown if graceful takes more than 30 seconds
    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 30_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM')); // Kubernetes pod termination
  process.on('SIGINT',  () => shutdown('SIGINT'));  // Ctrl+C during development
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

// Start the server
bootstrap().catch((err) => {
  console.error('FATAL: Failed to start NexusFinance backend:', err);
  process.exit(1);
});
