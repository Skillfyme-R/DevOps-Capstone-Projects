/**
 * NexusFinance Analytics API
 *
 * Powers the financial dashboard charts and spending insights.
 * These queries are expensive (aggregate across many rows),
 * so we cache results aggressively.
 *
 * GET /api/v1/analytics/summary          — Net worth, total assets/liabilities
 * GET /api/v1/analytics/spending          — Spending by category (pie chart data)
 * GET /api/v1/analytics/cashflow          — Income vs expenses over time (bar chart)
 * GET /api/v1/analytics/net-worth-history — Net worth trend (line chart)
 */

import Router from 'express-promise-router';
import { TABLES }      from '../../services/database';
import { CACHE_KEYS, CACHE_TTL } from '../../services/cache';
import { createLogger } from '../../utils/logger';

const logger = createLogger('nexus-analytics');

export function analyticsRoutes() {
  const router = Router();

  // GET /api/v1/analytics/summary
  router.get('/summary', async (req: any, res) => {
    const { db, cache, user } = req;
    const cacheKey = CACHE_KEYS.analyticsData(`summary:${user.id}`);

    const cached = await cache.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    // Total assets (all positive account balances)
    const accountsResult = await db(TABLES.ACCOUNTS)
      .where({ user_id: user.id, status: 'active' })
      .whereNull('deleted_at')
      .sum('balance as total_assets')
      .first();

    // Total loan liabilities
    const loansResult = await db(TABLES.LOANS)
      .where({ user_id: user.id, status: 'active' })
      .sum('outstanding_balance as total_liabilities')
      .first();

    const totalAssets      = parseFloat(accountsResult?.total_assets ?? '0');
    const totalLiabilities = parseFloat(loansResult?.total_liabilities ?? '0');
    const netWorth         = totalAssets - totalLiabilities;

    // Month-over-month change in net worth
    const lastMonthNetWorth = await getNetWorthAtDate(db, user.id, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const netWorthChange    = netWorth - lastMonthNetWorth;
    const netWorthChangePct = lastMonthNetWorth !== 0
      ? ((netWorthChange / Math.abs(lastMonthNetWorth)) * 100).toFixed(1)
      : '0';

    const summary = {
      totalAssets:       totalAssets.toFixed(2),
      totalLiabilities:  totalLiabilities.toFixed(2),
      netWorth:          netWorth.toFixed(2),
      netWorthChange:    netWorthChange.toFixed(2),
      netWorthChangePct: `${netWorthChangePct}%`,
      currency:          'USD',
      generatedAt:       new Date().toISOString(),
    };

    await cache.setEx(cacheKey, CACHE_TTL.ANALYTICS, JSON.stringify(summary));
    return res.json(summary);
  });

  // GET /api/v1/analytics/spending?months=3
  router.get('/spending', async (req: any, res) => {
    const { db, cache, user } = req;
    const months   = Math.min(Number(req.query.months ?? 1), 12);
    const cacheKey = CACHE_KEYS.analyticsData(`spending:${user.id}:${months}m`);

    const cached = await cache.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const userAccounts = await db(TABLES.ACCOUNTS)
      .where({ user_id: user.id }).whereNull('deleted_at').pluck('id');

    const sinceDate = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000);

    // Aggregate spending by category (negative amounts = spending)
    const spending = await db(TABLES.TRANSACTIONS)
      .whereIn('account_id', userAccounts)
      .where('amount', '<', 0)                   // Only debits (spending)
      .where('created_at', '>=', sinceDate)
      .where('type', 'not in', ['transfer'])      // Exclude internal transfers
      .groupBy('type')
      .select(
        'type as category',
        db.raw('SUM(ABS(amount)) as total'),
        db.raw('COUNT(*) as count')
      )
      .orderBy('total', 'desc');

    const totalSpending = spending.reduce((sum: number, row: any) => sum + parseFloat(row.total), 0);

    const result = {
      spending: spending.map((row: any) => ({
        category:   row.category,
        amount:     parseFloat(row.total).toFixed(2),
        count:      Number(row.count),
        percentage: ((parseFloat(row.total) / totalSpending) * 100).toFixed(1),
      })),
      totalSpending: totalSpending.toFixed(2),
      periodMonths:  months,
    };

    await cache.setEx(cacheKey, CACHE_TTL.ANALYTICS, JSON.stringify(result));
    return res.json(result);
  });

  // GET /api/v1/analytics/cashflow?months=6
  router.get('/cashflow', async (req: any, res) => {
    const { db, cache, user } = req;
    const months   = Math.min(Number(req.query.months ?? 6), 24);
    const cacheKey = CACHE_KEYS.analyticsData(`cashflow:${user.id}:${months}m`);

    const cached = await cache.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const userAccounts = await db(TABLES.ACCOUNTS)
      .where({ user_id: user.id }).whereNull('deleted_at').pluck('id');

    const sinceDate = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000);

    // Group by month: income vs expenses
    const cashflow = await db(TABLES.TRANSACTIONS)
      .whereIn('account_id', userAccounts)
      .where('created_at', '>=', sinceDate)
      .groupByRaw("DATE_TRUNC('month', created_at)")
      .select(
        db.raw("TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month"),
        db.raw('SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income'),
        db.raw('SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses')
      )
      .orderBy('month', 'asc');

    const result = {
      cashflow: cashflow.map((row: any) => ({
        month:    row.month,
        income:   parseFloat(row.income).toFixed(2),
        expenses: parseFloat(row.expenses).toFixed(2),
        net:      (parseFloat(row.income) - parseFloat(row.expenses)).toFixed(2),
      })),
      periodMonths: months,
    };

    await cache.setEx(cacheKey, CACHE_TTL.ANALYTICS, JSON.stringify(result));
    return res.json(result);
  });

  return router;
}

async function getNetWorthAtDate(db: any, userId: string, date: Date): Promise<number> {
  const result = await db(TABLES.ACCOUNTS)
    .where({ user_id: userId })
    .where('created_at', '<=', date)
    .sum('balance as total')
    .first();
  return parseFloat(result?.total ?? '0');
}
