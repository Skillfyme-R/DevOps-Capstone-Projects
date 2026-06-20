/**
 * VendorVault Analytics API
 *
 * GET /api/v1/analytics/sales              — GMV and order trends
 * GET /api/v1/analytics/top-products       — Best selling products
 * GET /api/v1/analytics/revenue-by-category— Revenue split by category
 * GET /api/v1/analytics/customers          — Customer acquisition metrics
 * GET /api/v1/analytics/vendor-performance — Vendor leaderboard
 */

import Router from 'express-promise-router';
import { TABLES } from '../../services/database';
import { CACHE_KEYS, CACHE_TTL } from '../../services/cache';
import { createLogger } from '../../utils/logger';

const logger = createLogger('vv-analytics');

function periodToInterval(period: string): string {
  switch (period) {
    case '7d':  return '7 days';
    case '1m':  return '30 days';
    case '3m':  return '90 days';
    case '6m':  return '180 days';
    case '1y':  return '365 days';
    default:    return '30 days';
  }
}

export function analyticsRoutes() {
  const router = Router();

  // GET /sales
  router.get('/sales', async (req: any, res) => {
    const { db, cache } = req;
    const { period = '1m' } = req.query;
    const interval = periodToInterval(period as string);

    const cacheKey = CACHE_KEYS.analyticsOverview(period as string);
    const cached   = await cache?.get(cacheKey);
    if (cached) return res.json({ ...JSON.parse(cached), source: 'cache' });

    const [revenue, orders] = await Promise.all([
      db(TABLES.ORDERS)
        .whereRaw(`created_at >= NOW() - INTERVAL '${interval}'`)
        .andWhere('status', '!=', 'cancelled')
        .sum('total_amount as total')
        .count('id as count')
        .first(),
      db.raw(`
        SELECT DATE_TRUNC('day', created_at) as day,
               COUNT(id) as orders,
               SUM(total_amount) as revenue
        FROM ${TABLES.ORDERS}
        WHERE created_at >= NOW() - INTERVAL '${interval}'
          AND status != 'cancelled'
        GROUP BY day
        ORDER BY day
      `),
    ]);

    const result = {
      gmv:       Number(revenue?.total ?? 0),
      orderCount: Number(revenue?.count ?? 0),
      trend:      orders.rows ?? [],
      period,
    };

    if (cache) await cache.setEx(cacheKey, CACHE_TTL.ANALYTICS, JSON.stringify(result));
    logger.debug('Sales analytics computed', { period });
    res.json(result);
  });

  // GET /top-products
  router.get('/top-products', async (req: any, res) => {
    const { db } = req;
    const { limit = 10, period = '1m' } = req.query;
    const interval = periodToInterval(period as string);

    const cacheKey = CACHE_KEYS.topProducts(Number(limit));
    const cached   = await req.cache?.get(cacheKey);
    if (cached) return res.json({ products: JSON.parse(cached), source: 'cache' });

    const products = await db(TABLES.ORDER_ITEMS)
      .join(TABLES.ORDERS, `${TABLES.ORDER_ITEMS}.order_id`, `${TABLES.ORDERS}.id`)
      .join(TABLES.PRODUCTS, `${TABLES.ORDER_ITEMS}.product_id`, `${TABLES.PRODUCTS}.id`)
      .whereRaw(`${TABLES.ORDERS}.created_at >= NOW() - INTERVAL '${interval}'`)
      .andWhereNot(`${TABLES.ORDERS}.status`, 'cancelled')
      .select(
        `${TABLES.PRODUCTS}.id`,
        `${TABLES.PRODUCTS}.name`,
        `${TABLES.PRODUCTS}.price`,
        db.raw(`SUM(${TABLES.ORDER_ITEMS}.quantity) as units_sold`),
        db.raw(`SUM(${TABLES.ORDER_ITEMS}.total) as revenue`),
      )
      .groupBy(`${TABLES.PRODUCTS}.id`, `${TABLES.PRODUCTS}.name`, `${TABLES.PRODUCTS}.price`)
      .orderBy('revenue', 'desc')
      .limit(Number(limit));

    if (req.cache) await req.cache.setEx(cacheKey, CACHE_TTL.ANALYTICS, JSON.stringify(products));
    res.json({ products });
  });

  // GET /revenue-by-category
  router.get('/revenue-by-category', async (req: any, res) => {
    const { db } = req;
    const { period = '1m' } = req.query;
    const interval = periodToInterval(period as string);

    const data = await db(TABLES.ORDER_ITEMS)
      .join(TABLES.ORDERS,     `${TABLES.ORDER_ITEMS}.order_id`,   `${TABLES.ORDERS}.id`)
      .join(TABLES.PRODUCTS,   `${TABLES.ORDER_ITEMS}.product_id`, `${TABLES.PRODUCTS}.id`)
      .join(TABLES.CATEGORIES, `${TABLES.PRODUCTS}.category_id`,   `${TABLES.CATEGORIES}.id`)
      .whereRaw(`${TABLES.ORDERS}.created_at >= NOW() - INTERVAL '${interval}'`)
      .andWhereNot(`${TABLES.ORDERS}.status`, 'cancelled')
      .select(
        `${TABLES.CATEGORIES}.name as category`,
        db.raw(`SUM(${TABLES.ORDER_ITEMS}.total) as revenue`),
        db.raw(`COUNT(DISTINCT ${TABLES.ORDER_ITEMS}.order_id) as orders`),
      )
      .groupBy(`${TABLES.CATEGORIES}.id`, `${TABLES.CATEGORIES}.name`)
      .orderBy('revenue', 'desc');

    res.json({ data, period });
  });

  // GET /customers
  router.get('/customers', async (req: any, res) => {
    const { db } = req;

    const [total, newThisMonth, repeatBuyers] = await Promise.all([
      db(TABLES.USERS).where({ role: 'customer' }).count('id as count').first(),
      db(TABLES.USERS).where({ role: 'customer' })
        .whereRaw(`created_at >= DATE_TRUNC('month', NOW())`).count('id as count').first(),
      db(TABLES.ORDERS)
        .select('user_id').groupBy('user_id')
        .having(db.raw('COUNT(id) > 1')).count('user_id as count').first(),
    ]);

    res.json({
      totalCustomers:  Number(total?.count ?? 0),
      newThisMonth:    Number(newThisMonth?.count ?? 0),
      repeatBuyers:    Number(repeatBuyers?.count ?? 0),
    });
  });

  // GET /vendor-performance
  router.get('/vendor-performance', async (req: any, res) => {
    const { db } = req;
    const { limit = 10 } = req.query;

    const vendors = await db(TABLES.VENDORS)
      .join(TABLES.ORDER_ITEMS, `${TABLES.VENDORS}.id`, `${TABLES.ORDER_ITEMS}.vendor_id`)
      .join(TABLES.ORDERS,      `${TABLES.ORDER_ITEMS}.order_id`, `${TABLES.ORDERS}.id`)
      .andWhereNot(`${TABLES.ORDERS}.status`, 'cancelled')
      .select(
        `${TABLES.VENDORS}.id`,
        `${TABLES.VENDORS}.store_name`,
        `${TABLES.VENDORS}.avg_rating`,
        `${TABLES.VENDORS}.is_verified`,
        db.raw(`SUM(${TABLES.ORDER_ITEMS}.total) as revenue`),
        db.raw(`COUNT(DISTINCT ${TABLES.ORDER_ITEMS}.order_id) as orders`),
      )
      .groupBy(`${TABLES.VENDORS}.id`, `${TABLES.VENDORS}.store_name`,
               `${TABLES.VENDORS}.avg_rating`, `${TABLES.VENDORS}.is_verified`)
      .orderBy('revenue', 'desc')
      .limit(Number(limit));

    res.json({ vendors });
  });

  return router;
}
