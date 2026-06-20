import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import { register as promRegister } from 'prom-client';
import { loadConfig } from './config/loader';
import { initDatabase } from './services/database';
import { initCache } from './services/cache';
import { requestId } from './middleware/requestId';
import { metricsMiddleware } from './middleware/metrics';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import authRoutes from './routes/auth';
import healthRoutes from './routes/health';

async function bootstrap() {
  const config = loadConfig();
  await initDatabase(config);
  await initCache(config);

  const app = express();

  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } } }));
  app.use(compression());
  const isDev = config.platform.environment === 'development';
  app.use(cors({
    origin: isDev ? /^http:\/\/localhost:\d+$/ : config.cors.allowedOrigins,
    credentials: true,
  }));
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
  app.use(requestId);
  app.use(metricsMiddleware);

  app.use('/api/v1/auth', authRoutes);
  app.use('/healthz', healthRoutes);
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', promRegister.contentType);
    res.end(await promRegister.metrics());
  });

  app.use(errorHandler);

  const port = config.services.auth.port;
  app.listen(port, () => {
    logger.info(`MediCore Auth Service listening on port ${port}`);
    logger.info(`Environment: ${config.platform.environment}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
