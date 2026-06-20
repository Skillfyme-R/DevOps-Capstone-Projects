import { Request, Response, NextFunction, RequestHandler, Router } from 'express';
import { register, Counter, Histogram, collectDefaultMetrics } from 'prom-client';

collectDefaultMetrics({ prefix: 'vv_' });

const httpRequests = new Counter({
  name:       'vv_http_requests_total',
  help:       'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

const httpDuration = new Histogram({
  name:       'vv_http_request_duration_seconds',
  help:       'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets:    [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

export function metricsMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route    = req.route?.path ?? req.path;
      const labels   = { method: req.method, route, status: String(res.statusCode) };
      httpRequests.inc(labels);
      httpDuration.observe(labels, duration);
    });
    next();
  };
}

export function metricsRoute() {
  const router = Router();
  router.get('/', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
  });
  return router;
}
