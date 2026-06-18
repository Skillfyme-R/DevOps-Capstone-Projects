/**
 * NexusFinance Audit Log API
 *
 * Every significant action in FinTech must be logged for:
 *   1. Regulatory compliance (SOX, PCI-DSS, GDPR)
 *   2. Fraud investigation (who did what and when?)
 *   3. Customer disputes (customer claims they didn't make a transfer)
 *
 * Audit logs are IMMUTABLE — they can never be deleted, only queried.
 * In production, they're replicated to a separate write-once storage.
 *
 * GET /api/v1/audit       — List audit events for the authenticated user
 * GET /api/v1/audit/:id   — Single audit event
 */

import Router from 'express-promise-router';
import { TABLES }  from '../../services/database';
import { requireRole } from '../../middleware/authMiddleware';

export function auditRoutes() {
  const router = Router();

  // Users can see their own audit trail
  router.get('/', async (req: any, res) => {
    const { db, user } = req;
    const { page = 1, limit = 50, action } = req.query;

    let query = db(TABLES.AUDIT_LOGS)
      .where({ user_id: user.id })
      .orderBy('created_at', 'desc')
      .limit(Math.min(Number(limit), 200))
      .offset((Number(page) - 1) * Number(limit));

    if (action) query = query.where({ action });

    const logs = await query;
    return res.json({ logs, page: Number(page) });
  });

  // Admins can see all audit logs (for compliance reviews)
  router.get('/admin/all', requireRole('admin', 'compliance'), async (req: any, res) => {
    const { db } = req;
    const { userId, action, startDate, endDate, page = 1, limit = 100 } = req.query;

    let query = db(TABLES.AUDIT_LOGS)
      .orderBy('created_at', 'desc')
      .limit(Math.min(Number(limit), 500))
      .offset((Number(page) - 1) * Number(limit));

    if (userId)    query = query.where({ user_id: userId });
    if (action)    query = query.where({ action });
    if (startDate) query = query.where('created_at', '>=', new Date(startDate as string));
    if (endDate)   query = query.where('created_at', '<=', new Date(endDate as string));

    const [logs, totalResult] = await Promise.all([
      query,
      db(TABLES.AUDIT_LOGS).count('id as count').first(),
    ]);

    return res.json({ logs, total: Number(totalResult?.count ?? 0) });
  });

  return router;
}
