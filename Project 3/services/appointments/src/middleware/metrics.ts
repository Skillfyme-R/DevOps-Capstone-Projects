import { Request, Response, NextFunction } from 'express';
import { Counter, Histogram, collectDefaultMetrics, register } from 'prom-client';

collectDefaultMetrics({ register, prefix: 'medicore_' });

const httpRequests = new Counter({
  name: 'medicore_auth_http_requests_total',
  help: 'Total HTTP requests to auth service',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpDuration = new Histogram({
  name: 'medicore_auth_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    httpRequests.labels(req.method, route, String(res.statusCode)).inc();
    httpDuration.labels(req.method, route, String(res.statusCode)).observe(duration);
  });
  next();
}
