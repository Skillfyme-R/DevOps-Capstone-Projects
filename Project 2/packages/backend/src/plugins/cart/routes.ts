/**
 * VendorVault Cart API
 *
 * GET    /api/v1/cart            — Get current cart
 * POST   /api/v1/cart/items      — Add item to cart
 * PATCH  /api/v1/cart/items/:id  — Update quantity
 * DELETE /api/v1/cart/items/:id  — Remove item
 * DELETE /api/v1/cart            — Clear cart
 * POST   /api/v1/cart/coupon     — Apply coupon code
 * DELETE /api/v1/cart/coupon     — Remove coupon
 */

import Router from 'express-promise-router';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { TABLES } from '../../services/database';
import { CACHE_KEYS, CACHE_TTL } from '../../services/cache';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../middleware/errorHandler';
import { createLogger } from '../../utils/logger';

const logger = createLogger('vv-cart');

const addItemSchema = Joi.object({
  productId:  Joi.string().uuid().required(),
  variantId:  Joi.string().uuid().optional(),
  quantity:   Joi.number().integer().min(1).max(99).required(),
});

export function cartRoutes() {
  const router = Router();

  // Resolve or create cart for user
  async function getOrCreateCart(db: any, userId: string) {
    let cart = await db(TABLES.CARTS).where({ user_id: userId, status: 'active' }).first();
    if (!cart) {
      const cartId = uuidv4();
      await db(TABLES.CARTS).insert({
        id: cartId, user_id: userId, status: 'active',
        coupon_id: null, created_at: new Date(), updated_at: new Date(),
      });
      cart = { id: cartId, user_id: userId, status: 'active', coupon_id: null };
    }
    return cart;
  }

  // GET /
  router.get('/', async (req: any, res) => {
    const { db, user } = req;
    const cart = await getOrCreateCart(db, user.id);

    const items = await db(TABLES.CART_ITEMS)
      .join(TABLES.PRODUCTS, `${TABLES.CART_ITEMS}.product_id`, `${TABLES.PRODUCTS}.id`)
      .select(
        `${TABLES.CART_ITEMS}.*`,
        `${TABLES.PRODUCTS}.name`,
        `${TABLES.PRODUCTS}.price`,
        `${TABLES.PRODUCTS}.stock`,
        `${TABLES.PRODUCTS}.vendor_id`,
      )
      .where({ [`${TABLES.CART_ITEMS}.cart_id`]: cart.id });

    const subtotal = items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
    res.json({ cart: { ...cart, items, subtotal } });
  });

  // POST /items
  router.post('/items', async (req: any, res) => {
    const { error, value } = addItemSchema.validate(req.body);
    if (error) throw new ValidationError(error.details[0].message);

    const { db, user } = req;
    const { productId, variantId, quantity } = value;

    const product = await db(TABLES.PRODUCTS).where({ id: productId, is_active: true }).first();
    if (!product) throw new NotFoundError('Product not found.');
    if (product.stock < quantity) throw new BusinessRuleError(`Only ${product.stock} items in stock.`);

    const cart = await getOrCreateCart(db, user.id);
    const existing = await db(TABLES.CART_ITEMS)
      .where({ cart_id: cart.id, product_id: productId, variant_id: variantId ?? null })
      .first();

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > product.stock) throw new BusinessRuleError(`Only ${product.stock} items available.`);
      await db(TABLES.CART_ITEMS).where({ id: existing.id }).update({ quantity: newQty, updated_at: new Date() });
    } else {
      await db(TABLES.CART_ITEMS).insert({
        id: uuidv4(), cart_id: cart.id, product_id: productId,
        variant_id: variantId ?? null, quantity,
        unit_price: product.price, created_at: new Date(), updated_at: new Date(),
      });
    }

    if (req.cache) await req.cache.del(CACHE_KEYS.userCart(user.id));
    logger.info('Item added to cart', { userId: user.id, productId, quantity });
    res.status(201).json({ message: 'Item added to cart.' });
  });

  // PATCH /items/:id
  router.patch('/items/:id', async (req: any, res) => {
    const { quantity } = req.body;
    if (!Number.isInteger(quantity) || quantity < 0) throw new ValidationError('Invalid quantity.');

    const { db, user } = req;
    const cart = await getOrCreateCart(db, user.id);
    const item = await db(TABLES.CART_ITEMS).where({ id: req.params.id, cart_id: cart.id }).first();
    if (!item) throw new NotFoundError('Cart item not found.');

    if (quantity === 0) {
      await db(TABLES.CART_ITEMS).where({ id: item.id }).delete();
    } else {
      await db(TABLES.CART_ITEMS).where({ id: item.id }).update({ quantity, updated_at: new Date() });
    }

    if (req.cache) await req.cache.del(CACHE_KEYS.userCart(user.id));
    res.json({ message: quantity === 0 ? 'Item removed.' : 'Quantity updated.' });
  });

  // DELETE /items/:id
  router.delete('/items/:id', async (req: any, res) => {
    const { db, user } = req;
    const cart = await getOrCreateCart(db, user.id);
    await db(TABLES.CART_ITEMS).where({ id: req.params.id, cart_id: cart.id }).delete();
    if (req.cache) await req.cache.del(CACHE_KEYS.userCart(user.id));
    res.json({ message: 'Item removed.' });
  });

  // DELETE / — clear cart
  router.delete('/', async (req: any, res) => {
    const { db, user } = req;
    const cart = await getOrCreateCart(db, user.id);
    await db(TABLES.CART_ITEMS).where({ cart_id: cart.id }).delete();
    await db(TABLES.CARTS).where({ id: cart.id }).update({ coupon_id: null, updated_at: new Date() });
    if (req.cache) await req.cache.del(CACHE_KEYS.userCart(user.id));
    res.json({ message: 'Cart cleared.' });
  });

  // POST /coupon
  router.post('/coupon', async (req: any, res) => {
    const { code } = req.body;
    if (!code) throw new ValidationError('Coupon code is required.');

    const coupon = await req.db(TABLES.COUPONS)
      .where({ code: code.toUpperCase(), is_active: true })
      .andWhere('expires_at', '>=', new Date())
      .first();

    if (!coupon) throw new NotFoundError('Coupon code is invalid or expired.');

    const cart = await getOrCreateCart(req.db, req.user.id);
    await req.db(TABLES.CARTS).where({ id: cart.id }).update({ coupon_id: coupon.id });

    res.json({ coupon: { code: coupon.code, discountType: coupon.discount_type, discountValue: coupon.discount_value } });
  });

  return router;
}
