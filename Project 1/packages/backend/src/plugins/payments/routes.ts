/**
 * NexusFinance Payments API (Stripe Integration)
 *
 * Handles external payments — sending money outside the platform.
 *
 * POST /api/v1/payments/initiate         — Send money (creates Stripe PaymentIntent)
 * POST /api/v1/payments/webhook          — Receive Stripe webhook events
 * GET  /api/v1/payments/methods          — List saved payment methods
 * POST /api/v1/payments/methods          — Add a payment method (card/bank)
 * DELETE /api/v1/payments/methods/:id    — Remove a payment method
 */

import Router from 'express-promise-router';
import Stripe from 'stripe';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { TABLES } from '../../services/database';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../middleware/errorHandler';
import { paymentVolumeUsd } from '../../middleware/metrics';
import { createLogger } from '../../utils/logger';

const logger = createLogger('nexus-payments');

const initiateSchema = Joi.object({
  fromAccountId:  Joi.string().uuid().required(),
  amount:         Joi.number().positive().precision(2).required(),
  currency:       Joi.string().length(3).uppercase().default('USD'),
  recipientEmail: Joi.string().email().optional(),
  recipientIban:  Joi.string().optional(),
  description:    Joi.string().max(200).optional(),
  paymentMethodId:Joi.string().optional(),
});

export function paymentRoutes() {
  const router = Router();

  let stripe: Stripe | null = null;
  function getStripe(): Stripe {
    if (!stripe) {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) throw new Error('Stripe secret key not configured');
      stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
    }
    return stripe;
  }

  // POST /api/v1/payments/initiate
  router.post('/initiate', async (req: any, res) => {
    const { error, value } = initiateSchema.validate(req.body);
    if (error) throw new ValidationError(error.details[0].message);

    const { db, user } = req;

    // Verify account belongs to user and has enough balance
    const account = await db(TABLES.ACCOUNTS)
      .where({ id: value.fromAccountId, user_id: user.id, status: 'active' })
      .whereNull('deleted_at').first();
    if (!account) throw new NotFoundError('Account', value.fromAccountId);

    if (parseFloat(account.available_balance) < value.amount) {
      throw new BusinessRuleError(
        `Insufficient funds. Available: $${account.available_balance}, Required: $${value.amount}`
      );
    }

    // Create Stripe PaymentIntent — authorizes the payment
    const paymentIntent = await getStripe().paymentIntents.create({
      amount:   Math.round(value.amount * 100),   // Stripe uses cents
      currency: value.currency.toLowerCase(),
      metadata: {
        userId:        user.id,
        accountId:     value.fromAccountId,
        nexusPaymentId: uuidv4(),
      },
      description: value.description,
    });

    // Record the payment in pending state
    const [payment] = await db(TABLES.PAYMENTS).insert({
      id:              uuidv4(),
      user_id:         user.id,
      account_id:      value.fromAccountId,
      stripe_payment_id: paymentIntent.id,
      amount:          value.amount,
      currency:        value.currency,
      status:          'pending',
      description:     value.description,
      created_at:      new Date(),
    }).returning('*');

    paymentVolumeUsd.labels('external').inc(value.amount);
    logger.info('Payment initiated', { paymentId: payment.id, amount: value.amount, userId: user.id });

    return res.status(201).json({
      paymentId:    payment.id,
      clientSecret: paymentIntent.client_secret,  // Frontend uses this to confirm payment
      status:       'pending',
      amount:       value.amount,
      currency:     value.currency,
    });
  });

  // POST /api/v1/payments/webhook — Stripe calls this after payment succeeds/fails
  router.post('/webhook', async (req: any, res) => {
    const sig    = req.headers['stripe-signature'] as string;
    const secret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(req.body, sig, secret);
    } catch {
      logger.warn('Invalid Stripe webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { db } = req;

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      await db(TABLES.PAYMENTS)
        .where({ stripe_payment_id: pi.id })
        .update({ status: 'completed', completed_at: new Date() });
      logger.info('Payment completed via webhook', { stripeId: pi.id });
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent;
      await db(TABLES.PAYMENTS)
        .where({ stripe_payment_id: pi.id })
        .update({ status: 'failed', failed_at: new Date() });
      logger.warn('Payment failed via webhook', { stripeId: pi.id });
    }

    return res.json({ received: true });
  });

  // GET /api/v1/payments/methods
  router.get('/methods', async (req: any, res) => {
    const { db, user } = req;
    const methods = await db(TABLES.PAYMENT_METHODS)
      .where({ user_id: user.id, is_active: true })
      .orderBy('is_default', 'desc');
    return res.json({ methods });
  });

  return router;
}
