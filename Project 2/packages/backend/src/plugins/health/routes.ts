import Router from 'express-promise-router';

export function healthRoutes() {
  const router = Router();

  router.get('/live', (_req, res) => {
    res.json({ status: 'alive', service: 'vendorvault-backend', timestamp: new Date().toISOString() });
  });

  router.get('/ready', async (req: any, res) => {
    const checks: Record<string, string> = {};
    try {
      await req.db.raw('SELECT 1');
      checks.database = 'ok';
    } catch { checks.database = 'fail'; }
    try {
      await req.cache.ping();
      checks.cache = 'ok';
    } catch { checks.cache = 'fail'; }

    const healthy = Object.values(checks).every(v => v === 'ok');
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ready' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
      version:   process.env.npm_package_version ?? '1.0.0',
    });
  });

  return router;
}
