/**
 * VendorVault Orders API
 *
 * GET  /api/v1/orders             — List orders for the current user
 * GET  /api/v1/orders/:id         — Order detail
 * POST /api/v1/orders             — Place new order (checkout)
 * PATCH /api/v1/orders/:id/cancel — Cancel order
 * PATCH /api/v1/orders/:id/confirm— Vendor confirms order
 * PATCH /api/v1/orders/:id/ship   — Vendor marks as shipped
 * GET  /api/v1/orders/:id/tracking— Shipment tracking info
 */

import Router from 'express-promise-router';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { TABLES } from '../../services/database';
import { ValidationError, NotFoundError, BusinessRuleError, ForbiddenError } from '../../middleware/errorHandler';
import { requireVendor } from '../../middleware/authMiddleware';
import { createLogger } from '../../utils/logger';
import { VVConfig } from '../../config/loader';

const logger = createLogger('vv-orders');

const placeOrderSchema = Joi.object({
  shippingAddressId: Joi.string().uuid().optional(),
  shippingAddress: Joi.object({
    street:  Joi.string().required(),
    city:    Joi.string().required(),
    state:   Joi.string().required(),
    zip:     Joi.string().required(),
    country: Joi.string().default('US'),
  }).optional(),
  paymentMethodId: Joi.string().required(),
  notes:           Joi.string().max(500).optional(),
}).or('shippingAddressId', 'shippingAddress');

export function ordersRoutes(_config: VVConfig) {
  const router = Router();

  // GET /
  router.get('/', async (req: any, res) => {
    const { db, user } = req;
    const { page = 1, limit = 20, status } = req.query;

    let query = db(TABLES.ORDERS).where({ user_id: user.id });
    if (status) query = query.where({ status });

    const [orders, [{ count }]] = await Promise.all([
      query.orderBy('created_at', 'desc').limit(Number(limit)).offset((Number(page) - 1) * Number(limit)),
      db(TABLES.ORDERS).where({ user_id: user.id }).count('id as count'),
    ]);

    res.json({ orders, total: Number(count), page: Number(page), limit: Number(limit) });
  });

  // GET /:id
  router.get('/:id', async (req: any, res) => {
    const { db, user } = req;
    const order = await db(TABLES.ORDERS).where({ id: req.params.id, user_id: user.id }).first();
    if (!order) throw new NotFoundError('Order not found.');

    const [items, statusLogs, shipments] = await Promise.all([
      db(TABLES.ORDER_ITEMS)
        .join(TABLES.PRODUCTS, `${TABLES.ORDER_ITEMS}.product_id`, `${TABLES.PRODUCTS}.id`)
        .select(`${TABLES.ORDER_ITEMS}.*`, `${TABLES.PRODUCTS}.name`)
        .where({ [`${TABLES.ORDER_ITEMS}.order_id`]: order.id }),
      db(TABLES.ORDER_STATUS_LOGS).where({ order_id: order.id }).orderBy('created_at', 'desc'),
      db(TABLES.SHIPMENTS).where({ order_id: order.id }),
    ]);

    res.json({ order: { ...order, items, statusLogs, shipments } });
  });

  // POST / — place order from cart
  router.post('/', async (req: any, res) => {
    const { error, value } = placeOrderSchema.validate(req.body);
    if (error) throw new ValidationError(error.details[0].message);

    const { db, user } = req;

    const cart = await db(TABLES.CARTS).where({ user_id: user.id, status: 'active' }).first();
    if (!cart) throw new BusinessRuleError('No active cart found.');

    const cartItems = await db(TABLES.CART_ITEMS)
      .join(TABLES.PRODUCTS, `${TABLES.CART_ITEMS}.product_id`, `${TABLES.PRODUCTS}.id`)
      .select(
        `${TABLES.CART_ITEMS}.*`,
        `${TABLES.PRODUCTS}.name`,
        `${TABLES.PRODUCTS}.price`,
        `${TABLES.PRODUCTS}.stock`,
        `${TABLES.PRODUCTS}.vendor_id`,
      )
      .where({ [`${TABLES.CART_ITEMS}.cart_id`]: cart.id });

    if (cartItems.length === 0) throw new BusinessRuleError('Your cart is empty.');

    for (const item of cartItems) {
      if (item.stock < item.quantity) {
        throw new BusinessRuleError(`"${item.name}" has insufficient stock (${item.stock} available).`);
      }
    }

    const subtotal = cartItems.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
    const tax      = subtotal * 0.08;
    const shipping = subtotal >= 50 ? 0 : 9.99;
    const total    = subtotal + tax + shipping;

    const orderId = uuidv4();
    await db.transaction(async (trx: any) => {
      await trx(TABLES.ORDERS).insert({
        id:          orderId,
        user_id:     user.id,
        status:      'pending',
        subtotal,
        tax_amount:  tax,
        shipping_fee: shipping,
        total_amount: total,
        payment_method_id: value.paymentMethodId,
        shipping_address: JSON.stringify(value.shippingAddress ?? {}),
        notes:       value.notes,
        created_at:  new Date(),
        updated_at:  new Date(),
      });

      for (const item of cartItems) {
        await trx(TABLES.ORDER_ITEMS).insert({
          id:         uuidv4(),
          order_id:   orderId,
          product_id: item.product_id,
          vendor_id:  item.vendor_id,
          quantity:   item.quantity,
          unit_price: item.price,
          total:      item.price * item.quantity,
          created_at: new Date(),
        });
        await trx(TABLES.PRODUCTS).where({ id: item.product_id }).decrement('stock', item.quantity);
      }

      // Log status
      await trx(TABLES.ORDER_STATUS_LOGS).insert({
        id: uuidv4(), order_id: orderId, status: 'pending',
        note: 'Order placed', created_at: new Date(),
      });

      // Mark cart as checked out
      await trx(TABLES.CARTS).where({ id: cart.id }).update({ status: 'checked_out', updated_at: new Date() });
    });

    logger.info('Order placed', { orderId, userId: user.id, total, items: cartItems.length });
    res.status(201).json({ orderId, total, message: 'Order placed successfully.' });
  });

  // PATCH /:id/cancel
  router.patch('/:id/cancel', async (req: any, res) => {
    const { db, user } = req;
    const order = await db(TABLES.ORDERS).where({ id: req.params.id, user_id: user.id }).first();
    if (!order) throw new NotFoundError('Order not found.');
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new BusinessRuleError(`Cannot cancel an order with status "${order.status}".`);
    }

    await db(TABLES.ORDERS).where({ id: order.id }).update({ status: 'cancelled', updated_at: new Date() });
    await db(TABLES.ORDER_STATUS_LOGS).insert({
      id: uuidv4(), order_id: order.id, status: 'cancelled',
      note: req.body.reason ?? 'Cancelled by customer', created_at: new Date(),
    });

    res.json({ message: 'Order cancelled.' });
  });

  // PATCH /:id/ship — vendor marks shipped
  router.patch('/:id/ship', requireVendor(), async (req: any, res) => {
    const { db } = req;
    const { trackingNumber, carrier } = req.body;

    const order = await db(TABLES.ORDERS).where({ id: req.params.id, status: 'confirmed' }).first();
    if (!order) throw new NotFoundError('Order not found or not in confirmed state.');

    await db.transaction(async (trx: any) => {
      await trx(TABLES.ORDERS).where({ id: order.id }).update({ status: 'shipped', updated_at: new Date() });
      await trx(TABLES.SHIPMENTS).insert({
        id: uuidv4(), order_id: order.id, tracking_number: trackingNumber,
        carrier, status: 'in_transit', shipped_at: new Date(), created_at: new Date(),
      });
      await trx(TABLES.ORDER_STATUS_LOGS).insert({
        id: uuidv4(), order_id: order.id, status: 'shipped',
        note: `Shipped via ${carrier}. Tracking: ${trackingNumber}`, created_at: new Date(),
      });
    });

    logger.info('Order shipped', { orderId: order.id, trackingNumber, carrier });
    res.json({ message: 'Order marked as shipped.' });
  });

  // GET /:id/tracking
  router.get('/:id/tracking', async (req: any, res) => {
    const { db, user } = req;
    const order = await db(TABLES.ORDERS).where({ id: req.params.id, user_id: user.id }).first();
    if (!order) throw new NotFoundError('Order not found.');

    const shipment = await db(TABLES.SHIPMENTS).where({ order_id: order.id }).first();
    res.json({ tracking: shipment ?? null, orderStatus: order.status });
  });

  return router;
}
