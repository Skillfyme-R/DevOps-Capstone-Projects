/**
 * VendorVault Catalog API
 *
 * GET  /api/v1/catalog/products          — Browse products (filter, sort, paginate)
 * GET  /api/v1/catalog/products/:id      — Single product detail
 * GET  /api/v1/catalog/search            — Full-text product search
 * GET  /api/v1/catalog/categories        — Category tree
 * GET  /api/v1/catalog/featured          — Curated featured products
 * GET  /api/v1/catalog/flash-sales       — Active flash sale items
 * POST /api/v1/catalog/products          — Create product (vendor only)
 * PATCH /api/v1/catalog/products/:id     — Update product (vendor owner only)
 * DELETE /api/v1/catalog/products/:id    — Soft-delete product (vendor owner only)
 */

import Router from 'express-promise-router';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { TABLES } from '../../services/database';
import { CACHE_KEYS, CACHE_TTL } from '../../services/cache';
import { ValidationError, NotFoundError, ForbiddenError } from '../../middleware/errorHandler';
import { authMiddleware, requireVendor } from '../../middleware/authMiddleware';
import { createLogger } from '../../utils/logger';

const logger = createLogger('vv-catalog');

const createProductSchema = Joi.object({
  name:          Joi.string().min(3).max(200).required(),
  description:   Joi.string().max(5000).required(),
  categoryId:    Joi.string().uuid().required(),
  price:         Joi.number().positive().required(),
  comparePrice:  Joi.number().positive().optional(),
  sku:           Joi.string().max(100).required(),
  stock:         Joi.number().integer().min(0).required(),
  weight:        Joi.number().positive().optional(),
  tags:          Joi.array().items(Joi.string()).max(20).optional(),
  isActive:      Joi.boolean().default(true),
});

export function catalogRoutes() {
  const router = Router();

  // GET /products — paginated product listing with filters
  router.get('/products', async (req: any, res) => {
    const { db, cache } = req;
    const {
      page = 1, limit = 24, category, vendor, minPrice, maxPrice,
      sort = 'created_at', order = 'desc', inStock,
    } = req.query;

    const cacheKey = CACHE_KEYS.catalogPage(
      Number(page),
      JSON.stringify({ category, vendor, minPrice, maxPrice, sort, order, inStock })
    );
    const cached = await cache?.get(cacheKey);
    if (cached) return res.json({ ...JSON.parse(cached), source: 'cache' });

    let query = db(TABLES.PRODUCTS)
      .join(TABLES.VENDORS, `${TABLES.PRODUCTS}.vendor_id`, `${TABLES.VENDORS}.id`)
      .select(
        `${TABLES.PRODUCTS}.*`,
        `${TABLES.VENDORS}.store_name as vendor_name`,
        `${TABLES.VENDORS}.is_verified as vendor_verified`
      )
      .where(`${TABLES.PRODUCTS}.is_active`, true);

    if (category)   query = query.where(`${TABLES.PRODUCTS}.category_id`, category);
    if (vendor)     query = query.where(`${TABLES.PRODUCTS}.vendor_id`, vendor);
    if (minPrice)   query = query.where(`${TABLES.PRODUCTS}.price`, '>=', Number(minPrice));
    if (maxPrice)   query = query.where(`${TABLES.PRODUCTS}.price`, '<=', Number(maxPrice));
    if (inStock === 'true') query = query.where(`${TABLES.PRODUCTS}.stock`, '>', 0);

    const validSorts: Record<string, string> = {
      price: `${TABLES.PRODUCTS}.price`,
      created_at: `${TABLES.PRODUCTS}.created_at`,
      rating: `${TABLES.PRODUCTS}.avg_rating`,
    };
    const sortCol = validSorts[sort as string] ?? `${TABLES.PRODUCTS}.created_at`;
    query = query.orderBy(sortCol, order === 'asc' ? 'asc' : 'desc');

    const offset = (Number(page) - 1) * Number(limit);
    const [products, [{ count }]] = await Promise.all([
      query.limit(Number(limit)).offset(offset),
      db(TABLES.PRODUCTS).where({ is_active: true }).count('id as count'),
    ]);

    const result = { products, total: Number(count), page: Number(page), limit: Number(limit) };
    if (cache) await cache.setEx(cacheKey, CACHE_TTL.CATALOG_PAGE, JSON.stringify(result));

    res.json(result);
  });

  // GET /products/:id
  router.get('/products/:id', async (req: any, res) => {
    const { db, cache } = req;
    const { id } = req.params;

    const cacheKey = CACHE_KEYS.productDetail(id);
    const cached   = await cache?.get(cacheKey);
    if (cached) return res.json({ product: JSON.parse(cached), source: 'cache' });

    const product = await db(TABLES.PRODUCTS)
      .join(TABLES.VENDORS, `${TABLES.PRODUCTS}.vendor_id`, `${TABLES.VENDORS}.id`)
      .select(
        `${TABLES.PRODUCTS}.*`,
        `${TABLES.VENDORS}.store_name as vendor_name`,
        `${TABLES.VENDORS}.is_verified as vendor_verified`,
        `${TABLES.VENDORS}.avg_rating as vendor_rating`,
      )
      .where(`${TABLES.PRODUCTS}.id`, id)
      .andWhere(`${TABLES.PRODUCTS}.is_active`, true)
      .first();

    if (!product) throw new NotFoundError('Product not found.');

    const [images, variants, reviews] = await Promise.all([
      db(TABLES.PRODUCT_IMAGES).where({ product_id: id }).orderBy('sort_order'),
      db(TABLES.PRODUCT_VARIANTS).where({ product_id: id, is_active: true }),
      db(TABLES.PRODUCT_REVIEWS).where({ product_id: id }).orderBy('created_at', 'desc').limit(5),
    ]);

    const full = { ...product, images, variants, reviews };
    if (cache) await cache.setEx(cacheKey, CACHE_TTL.PRODUCT_DETAIL, JSON.stringify(full));

    res.json({ product: full });
  });

  // GET /search
  router.get('/search', async (req: any, res) => {
    const { db } = req;
    const { q, limit = 20 } = req.query;
    if (!q) return res.json({ products: [], query: q });

    const products = await db(TABLES.PRODUCTS)
      .whereRaw(`to_tsvector('english', name || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', ?)`, [q])
      .andWhere({ is_active: true })
      .limit(Number(limit));

    logger.info('Search performed', { query: q, results: products.length });
    res.json({ products, query: q, total: products.length });
  });

  // GET /categories
  router.get('/categories', async (req: any, res) => {
    const categories = await req.db(TABLES.CATEGORIES)
      .where({ is_active: true })
      .orderBy('sort_order');
    res.json({ categories });
  });

  // GET /featured
  router.get('/featured', async (req: any, res) => {
    const products = await req.db(TABLES.PRODUCTS)
      .where({ is_featured: true, is_active: true })
      .orderBy('avg_rating', 'desc')
      .limit(12);
    res.json({ products });
  });

  // GET /flash-sales
  router.get('/flash-sales', async (req: any, res) => {
    const now   = new Date();
    const sales = await req.db(TABLES.FLASH_SALES)
      .where('starts_at', '<=', now)
      .andWhere('ends_at',   '>=', now)
      .andWhere('is_active',  true);
    res.json({ sales, serverTime: now.toISOString() });
  });

  // POST /products — vendor creates product
  router.post('/products', authMiddleware, requireVendor(), async (req: any, res) => {
    const { error, value } = createProductSchema.validate(req.body);
    if (error) throw new ValidationError(error.details[0].message);

    const vendor = await req.db(TABLES.VENDORS).where({ user_id: req.user.id }).first();
    if (!vendor) throw new ForbiddenError('Vendor account not found.');

    const productId = uuidv4();
    await req.db(TABLES.PRODUCTS).insert({
      id:            productId,
      vendor_id:     vendor.id,
      category_id:   value.categoryId,
      name:          value.name,
      description:   value.description,
      price:         value.price,
      compare_price: value.comparePrice,
      sku:           value.sku,
      stock:         value.stock,
      weight:        value.weight,
      tags:          JSON.stringify(value.tags ?? []),
      is_active:     value.isActive,
      is_featured:   false,
      avg_rating:    0,
      review_count:  0,
      created_at:    new Date(),
      updated_at:    new Date(),
    });

    logger.info('Product created', { productId, vendorId: vendor.id });
    res.status(201).json({ productId, message: 'Product created successfully.' });
  });

  // PATCH /products/:id — vendor updates own product
  router.patch('/products/:id', authMiddleware, requireVendor(), async (req: any, res) => {
    const { id } = req.params;
    const vendor  = await req.db(TABLES.VENDORS).where({ user_id: req.user.id }).first();
    const product = await req.db(TABLES.PRODUCTS).where({ id, vendor_id: vendor?.id }).first();
    if (!product) throw new NotFoundError('Product not found or not owned by this vendor.');

    const allowed = ['name', 'description', 'price', 'stock', 'is_active'];
    const updates: Record<string, unknown> = { updated_at: new Date() };
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }

    await req.db(TABLES.PRODUCTS).where({ id }).update(updates);
    if (req.cache) await req.cache.del(CACHE_KEYS.productDetail(id));

    res.json({ message: 'Product updated.' });
  });

  return router;
}
