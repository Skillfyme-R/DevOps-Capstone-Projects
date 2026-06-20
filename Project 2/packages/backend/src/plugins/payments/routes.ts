/**
 * VendorVault Payments API
 *
 * POST /api/v1/payments/intent        — Create Stripe PaymentIntent
 * POST /api/v1/payments/confirm       — Confirm payment after client side
 * POST /api/v1/payments/webhook       — Stripe webhook endpoint
 * GET  /api/v1/payments/methods       — List saved payment methods
 * POST /api/v1/payments/methods       — Save a new payment method
 * DELETE /api/v1/payments/methods/:id — Remove a payment method
 * GET  /api/v1/payments/history       — Payment history
 */

import Router from 'express-promise-router';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import { TABLES } from '../../services/database';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../middleware/errorHandler';
import { createLogger } from '../../utils/logger';
import { VVConfig } from '../../config/loader';

const logger = createLogger('vv-payments');

const intentSchema = Joi.object({
  orderId:  Joi.string().uuid().required(),
  currency: Joi.string().length(3).uppercase().default('USD'),
});

export function paymentsRoutes(config: VVConfig) {
  const router = Router();

  const stripe = config.payments?.stripe?.secretKey
    ? new Stripe(config.payments.stripe.secretKey, { apiVersion: '2023-08-16' })
    : null;

  // POST /intent
  router.post('/intent', async (req: any, res) => {
    const { error, value } = intentSchema.validate(req.body);
    if (error) throw new ValidationError(error.details[0].message);

    const { db, user } = req;
    const order = await db(TABLES.ORDERS).where({ id: value.orderId, user_id: user.id }).first();
    if (!order) throw new NotFoundError('Order not found.');
    if (order.status !== 'pending') throw new BusinessRuleError('Order is not awaiting payment.');

    if (!stripe) {
      return res.json({ clientSecret: 'pi_test_placeholder_secret', testMode: true });
    }

    const intent = await stripe.paymentIntents.create({
      amount:   Math.round(order.total_amount * 100),
      currency: value.currency.toLowerCase(),
      metadata: { orderId: order.id, userId: user.id, platform: 'vendorvault' },
    });

    logger.info('Payment intent created', { orderId: order.id, intentId: intent.id });
    res.json({ clientSecret: intent.client_secret, intentId: intent.id });
  });

  // POST /webhook — Stripe webhook
  router.post('/webhook', async (req: any, res) => {
    const sig    = req.headers['stripe-signature'];
    const secret = config.payments?.stripe?.webhookSecret;

    if (!stripe || !secret || !sig) {
      return res.json({ received: true, note: 'webhook verification skipped (not configured)' });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err: any) {
      logger.warn('Webhook signature verification failed', { error: err.message });
      return res.status(400).json({ error: 'Webhook signature invalid.' });
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent  = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata.orderId;
      await req.db(TABLES.ORDERS).where({ id: orderId }).update({
        status:     'confirmed',
        paid_at:    new Date(),
        updated_at: new Date(),
      });
      await req.db(TABLES.ORDER_STATUS_LOGS).insert({
        id: uuidv4(), order_id: orderId, status: 'confirmed',
        note: `Payment confirmed via Stripe (${intent.id})`, created_at: new Date(),
      });
      logger.info('Payment confirmed', { orderId, intentId: intent.id });
    }

    res.json({ received: true });
  });

  // GET /methods
  router.get('/methods', async (req: any, res) => {
    const methods = await req.db(TABLES.PAYMENT_METHODS)
      .where({ user_id: req.user.id })
      .orderBy('is_default', 'desc');
    res.json({ methods });
  });

  // GET /history
  router.get('/history', async (req: any, res) => {
    const { page = 1, limit = 20 } = req.query;
    const payments = await req.db(TABLES.PAYMENTS)
      .where({ user_id: req.user.id })
      .orderBy('created_at', 'desc')
      .limit(Number(limit))
      .offset((Number(page) - 1) * Number(limit));
    res.json({ payments, page: Number(page) });
  });

  return router;
}
