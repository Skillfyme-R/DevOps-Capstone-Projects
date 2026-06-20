import Router from 'express-promise-router';
import { TABLES } from '../../services/database';
import { requireAdmin } from '../../middleware/authMiddleware';

export function auditRoutes() {
  const router = Router();

  router.get('/', requireAdmin(), async (req: any, res) => {
    const { page = 1, limit = 50, entityType, actorId } = req.query;
    let query = req.db(TABLES.AUDIT_LOGS).orderBy('created_at', 'desc');
    if (entityType) query = query.where({ entity_type: entityType });
    if (actorId)    query = query.where({ actor_id: actorId });

    const logs = await query.limit(Number(limit)).offset((Number(page) - 1) * Number(limit));
    res.json({ logs, page: Number(page) });
  });

  return router;
}
