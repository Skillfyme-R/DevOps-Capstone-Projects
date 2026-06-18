/**
 * Health Check Routes
 *
 * Kubernetes calls GET /healthz to know if the pod is alive.
 * If this returns non-200, K8s restarts the pod.
 *
 * Two types:
 *   /healthz/live  — Is the process running? (liveness probe)
 *                    Returns 200 as long as the process hasn't crashed.
 *
 *   /healthz/ready — Is the app ready to serve traffic? (readiness probe)
 *                    Returns 200 only when DB and Redis are connected.
 *                    K8s removes the pod from load balancer if this fails.
 */

import Router from 'express-promise-router';

export function healthRoutes() {
  const router = Router();

  // Liveness: Is the process alive?
  router.get('/live', (_req, res) => {
    res.json({
      status: 'alive',
      service: 'nexusfinance-backend',
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness: Can we serve requests?
  router.get('/ready', async (req: any, res) => {
    const checks: Record<string, 'ok' | 'error'> = {};
    let httpStatus = 200;

    // Check database connection
    try {
      await req.db.raw('SELECT 1');
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
      httpStatus = 503; // Service Unavailable
    }

    // Check Redis connection
    try {
      await req.cache.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
      httpStatus = 503;
    }

    res.status(httpStatus).json({
      status:    httpStatus === 200 ? 'ready' : 'degraded',
      checks,
      uptime:    process.uptime(),
      timestamp: new Date().toISOString(),
      version:   process.env.npm_package_version ?? '1.0.0',
    });
  });

  // Root health check (combined)
  router.get('/', (_req, res) => {
    res.json({
      platform:  'NexusFinance',
      status:    'running',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
