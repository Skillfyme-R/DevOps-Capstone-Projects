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
import appointmentRoutes from './routes/appointments';
import slotRoutes from './routes/slots';
import healthRoutes from './routes/health';

async function bootstrap() {
  const config = loadConfig();
  await initDatabase(config);
  await initCache(config);

  const app = express();
  app.use(helmet());
  app.use(compression());
  app.use(cors({ origin: config.cors?.allowedOrigins || '*', credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('combined', { stream: { write: (m) => logger.http(m.trim()) } }));
  app.use(requestId);
  app.use(metricsMiddleware);

  app.use('/api/v1/appointments', appointmentRoutes);
  app.use('/api/v1/slots', slotRoutes);
  app.use('/healthz', healthRoutes);
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', promRegister.contentType);
    res.end(await promRegister.metrics());
  });

  app.use(errorHandler);

  const port = Number(process.env.APPOINTMENT_SERVICE_PORT) || 9003;
  app.listen(port, () => logger.info(`MediCore Appointment Service listening on port ${port}`));
}

bootstrap().catch((err) => { console.error(err); process.exit(1); });
