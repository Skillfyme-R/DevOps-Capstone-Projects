import { Router } from 'express';
import { getDb } from '../services/database';
import { getCache } from '../services/cache';

const router = Router();

router.get('/live', (_req, res) => res.json({ status: 'ok', service: 'medicore-auth' }));

router.get('/ready', async (_req, res) => {
  try {
    await getDb().raw('SELECT 1');
    await getCache().ping();
    res.json({ status: 'ready', checks: { database: 'ok', cache: 'ok' } });
  } catch (err) {
    res.status(503).json({ status: 'not_ready', error: String(err) });
  }
});

export default router;
