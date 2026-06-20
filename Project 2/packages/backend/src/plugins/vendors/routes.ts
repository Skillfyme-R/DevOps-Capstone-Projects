/**
 * VendorVault Vendors API
 *
 * GET  /api/v1/vendors           — Browse vendors (public)
 * GET  /api/v1/vendors/:id       — Vendor profile + products (public)
 * GET  /api/v1/vendors/me/stats  — Current vendor's performance stats
 * GET  /api/v1/vendors/me/orders — Current vendor's incoming orders
 * PATCH /api/v1/vendors/me       — Update vendor profile
 */

import Router from 'express-promise-router';
import Joi from 'joi';
import { TABLES } from '../../services/database';
import { CACHE_KEYS, CACHE_TTL } from '../../services/cache';
import { NotFoundError, ForbiddenError } from '../../middleware/errorHandler';
import { authMiddleware, requireVendor } from '../../middleware/authMiddleware';
import { createLogger } from '../../utils/logger';

const logger = createLogger('vv-vendors');

export function vendorsRoutes() {
  const router = Router();

  // GET / — public vendor listing
  router.get('/', async (req: any, res) => {
    const { db } = req;
    const { page = 1, limit = 20, category, search } = req.query;

    let query = db(TABLES.VENDORS)
      .join(TABLES.USERS, `${TABLES.VENDORS}.user_id`, `${TABLES.USERS}.id`)
      .select(
        `${TABLES.VENDORS}.id`,
        `${TABLES.VENDORS}.store_name`,
        `${TABLES.VENDORS}.description`,
        `${TABLES.VENDORS}.avg_rating`,
        `${TABLES.VENDORS}.review_count`,
        `${TABLES.VENDORS}.is_verified`,
        `${TABLES.VENDORS}.total_sales`,
        `${TABLES.VENDORS}.created_at`,
      )
      .where(`${TABLES.VENDORS}.is_active`, true);

    if (search) query = query.whereRaw(`${TABLES.VENDORS}.store_name ILIKE ?`, [`%${search}%`]);

    const [vendors, [{ count }]] = await Promise.all([
      query.orderBy(`${TABLES.VENDORS}.avg_rating`, 'desc')
           .limit(Number(limit)).offset((Number(page) - 1) * Number(limit)),
      db(TABLES.VENDORS).where({ is_active: true }).count('id as count'),
    ]);

    res.json({ vendors, total: Number(count), page: Number(page) });
  });

  // GET /:id — public vendor profile
  router.get('/:id', async (req: any, res) => {
    const { db, cache } = req;
    const { id } = req.params;

    const cacheKey = CACHE_KEYS.vendorProfile(id);
    const cached   = await cache?.get(cacheKey);
    if (cached) return res.json({ vendor: JSON.parse(cached), source: 'cache' });

    const vendor = await db(TABLES.VENDORS)
      .join(TABLES.USERS, `${TABLES.VENDORS}.user_id`, `${TABLES.USERS}.id`)
      .select(
        `${TABLES.VENDORS}.*`,
        `${TABLES.USERS}.name as owner_name`,
      )
      .where(`${TABLES.VENDORS}.id`, id)
      .andWhere(`${TABLES.VENDORS}.is_active`, true)
      .first();

    if (!vendor) throw new NotFoundError('Vendor not found.');

    const products = await db(TABLES.PRODUCTS)
      .where({ vendor_id: id, is_active: true })
      .orderBy('avg_rating', 'desc')
      .limit(20);

    const result = { ...vendor, products };
    if (cache) await cache.setEx(cacheKey, CACHE_TTL.VENDOR_PROFILE, JSON.stringify(result));

    res.json({ vendor: result });
  });

  // GET /me/stats — vendor's own analytics (authenticated)
  router.get('/me/stats', authMiddleware, requireVendor(), async (req: any, res) => {
    const { db, user } = req;
    const vendor = await db(TABLES.VENDORS).where({ user_id: user.id }).first();
    if (!vendor) throw new ForbiddenError('Vendor profile not found.');

    const [productCount, totalOrders, totalRevenue, pendingOrders] = await Promise.all([
      db(TABLES.PRODUCTS).where({ vendor_id: vendor.id, is_active: true }).count('id as count').first(),
      db(TABLES.ORDER_ITEMS).where({ vendor_id: vendor.id }).count('id as count').first(),
      db(TABLES.ORDER_ITEMS).where({ vendor_id: vendor.id }).sum('total as total').first(),
      db(TABLES.ORDERS)
        .join(TABLES.ORDER_ITEMS, `${TABLES.ORDERS}.id`, `${TABLES.ORDER_ITEMS}.order_id`)
        .where(`${TABLES.ORDER_ITEMS}.vendor_id`, vendor.id)
        .andWhere(`${TABLES.ORDERS}.status`, 'pending')
        .countDistinct(`${TABLES.ORDERS}.id as count`)
        .first(),
    ]);

    res.json({
      stats: {
        productCount:  Number(productCount?.count ?? 0),
        totalOrders:   Number(totalOrders?.count  ?? 0),
        totalRevenue:  Number(totalRevenue?.total  ?? 0),
        pendingOrders: Number(pendingOrders?.count ?? 0),
        avgRating:     vendor.avg_rating,
        reviewCount:   vendor.review_count,
        isVerified:    vendor.is_verified,
      },
    });
  });

  // GET /me/orders — vendor's incoming orders
  router.get('/me/orders', authMiddleware, requireVendor(), async (req: any, res) => {
    const { db, user } = req;
    const { status, page = 1, limit = 20 } = req.query;

    const vendor = await db(TABLES.VENDORS).where({ user_id: user.id }).first();
    if (!vendor) throw new ForbiddenError('Vendor profile not found.');

    let query = db(TABLES.ORDERS)
      .join(TABLES.ORDER_ITEMS, `${TABLES.ORDERS}.id`, `${TABLES.ORDER_ITEMS}.order_id`)
      .where(`${TABLES.ORDER_ITEMS}.vendor_id`, vendor.id);

    if (status) query = query.andWhere(`${TABLES.ORDERS}.status`, status);

    const orders = await query
      .select(`${TABLES.ORDERS}.*`)
      .distinct(`${TABLES.ORDERS}.id`)
      .orderBy(`${TABLES.ORDERS}.created_at`, 'desc')
      .limit(Number(limit)).offset((Number(page) - 1) * Number(limit));

    logger.debug('Vendor orders fetched', { vendorId: vendor.id, count: orders.length });
    res.json({ orders, page: Number(page) });
  });

  // PATCH /me — vendor updates own store profile
  router.patch('/me', authMiddleware, requireVendor(), async (req: any, res) => {
    const { db, user } = req;
    const vendor = await db(TABLES.VENDORS).where({ user_id: user.id }).first();
    if (!vendor) throw new ForbiddenError('Vendor profile not found.');

    const allowed = ['store_name', 'description', 'logo_url', 'banner_url', 'contact_email', 'contact_phone'];
    const updates: Record<string, unknown> = { updated_at: new Date() };
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }

    await db(TABLES.VENDORS).where({ id: vendor.id }).update(updates);
    if (req.cache) await req.cache.del(CACHE_KEYS.vendorProfile(vendor.id));

    res.json({ message: 'Vendor profile updated.' });
  });

  return router;
}
