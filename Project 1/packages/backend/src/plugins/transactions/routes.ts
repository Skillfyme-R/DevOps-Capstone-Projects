/**
 * NexusFinance Transactions API
 *
 * A transaction is any movement of money in or out of an account.
 * Types: deposit | withdrawal | transfer | payment | fee | interest | refund
 *
 * CRITICAL: Transfers must use database TRANSACTIONS (not to be confused with
 * financial transactions). A DB transaction ensures:
 *   - Debit from Account A AND Credit to Account B happen together
 *   - If any step fails, BOTH are rolled back
 *   - You never end up with money debited but not credited
 *   This is called ACID compliance (Atomicity, Consistency, Isolation, Durability)
 *
 * GET  /api/v1/transactions              — List transactions (with filters)
 * GET  /api/v1/transactions/:id          — Single transaction
 * POST /api/v1/transactions/transfer     — Move money between accounts
 * POST /api/v1/transactions/deposit      — Add funds
 * POST /api/v1/transactions/withdrawal   — Remove funds
 */

import Router from 'express-promise-router';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { Knex } from 'knex';

import { TABLES }        from '../../services/database';
import { CACHE_KEYS }    from '../../services/cache';
import { transactionsTotal } from '../../middleware/metrics';
import {
  ValidationError, NotFoundError,
  BusinessRuleError, ComplianceError
} from '../../middleware/errorHandler';
import { createLogger }  from '../../utils/logger';

const logger = createLogger('nexus-transactions');

const transferSchema = Joi.object({
  fromAccountId: Joi.string().uuid().required(),
  toAccountId:   Joi.string().uuid().required(),
  amount:        Joi.number().positive().precision(2).required(),
  currency:      Joi.string().length(3).uppercase().default('USD'),
  description:   Joi.string().max(200).optional().allow(''),
  reference:     Joi.string().max(50).optional().allow(''),
});

const depositSchema = Joi.object({
  accountId:   Joi.string().uuid().required(),
  amount:      Joi.number().positive().precision(2).required(),
  currency:    Joi.string().length(3).uppercase().default('USD'),
  description: Joi.string().max(200).optional().allow(''),
  source:      Joi.string().valid('bank_transfer', 'card', 'cash').default('bank_transfer'),
});

const withdrawalSchema = Joi.object({
  accountId:   Joi.string().uuid().required(),
  amount:      Joi.number().positive().precision(2).required(),
  currency:    Joi.string().length(3).uppercase().default('USD'),
  description: Joi.string().max(200).optional().allow(''),
});

export function transactionRoutes() {
  const router = Router();

  // GET /api/v1/transactions — with filtering and pagination
  router.get('/', async (req: any, res) => {
    const { db, user } = req;
    const {
      accountId, type, startDate, endDate,
      minAmount, maxAmount, page = 1, limit = 20,
    } = req.query;

    // Get all account IDs belonging to this user (for security)
    const userAccounts = await db(TABLES.ACCOUNTS)
      .where({ user_id: user.id }).whereNull('deleted_at')
      .pluck('id'); // pluck returns array of just the 'id' values

    let query = db(TABLES.TRANSACTIONS)
      .whereIn('account_id', userAccounts)
      .orderBy('created_at', 'desc')
      .limit(Math.min(Number(limit), 100))    // Cap at 100 per page
      .offset((Number(page) - 1) * Number(limit));

    // Apply optional filters
    if (accountId) query = query.where({ account_id: accountId });
    if (type)      query = query.where({ type });
    if (startDate) query = query.where('created_at', '>=', new Date(startDate as string));
    if (endDate)   query = query.where('created_at', '<=', new Date(endDate as string));
    if (minAmount) query = query.where('amount', '>=', Number(minAmount));
    if (maxAmount) query = query.where('amount', '<=', Number(maxAmount));

    const [transactions, totalResult] = await Promise.all([
      query,
      db(TABLES.TRANSACTIONS).whereIn('account_id', userAccounts).count('id as count').first(),
    ]);

    return res.json({
      transactions,
      pagination: {
        total: Number(totalResult?.count ?? 0),
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(Number(totalResult?.count ?? 0) / Number(limit)),
      },
    });
  });

  // GET /api/v1/transactions/:id
  router.get('/:id', async (req: any, res) => {
    const { db, user } = req;

    const userAccounts = await db(TABLES.ACCOUNTS)
      .where({ user_id: user.id }).whereNull('deleted_at').pluck('id');

    const tx = await db(TABLES.TRANSACTIONS)
      .where({ id: req.params.id })
      .whereIn('account_id', userAccounts)
      .first();

    if (!tx) throw new NotFoundError('Transaction', req.params.id);
    return res.json(tx);
  });

  // POST /api/v1/transactions/transfer — CRITICAL: uses DB transaction for atomicity
  router.post('/transfer', async (req: any, res) => {
    const { error, value } = transferSchema.validate(req.body);
    if (error) throw new ValidationError(error.details[0].message);

    const { db, cache, user, config } = req;
    const { fromAccountId, toAccountId, amount, currency, description } = value;

    if (fromAccountId === toAccountId) {
      throw new ValidationError('Source and destination accounts must be different.');
    }

    // Enforce transaction limit from config
    const singleLimit = config.nexusfinance?.banking?.transactionLimits?.singleTransfer ?? 10000;
    if (amount > singleLimit) {
      throw new BusinessRuleError(
        `Transfer amount $${amount} exceeds single transaction limit of $${singleLimit}.`,
        { requested: amount, limit: singleLimit }
      );
    }

    // Verify from-account belongs to this user
    const fromAccount = await db(TABLES.ACCOUNTS)
      .where({ id: fromAccountId, user_id: user.id, status: 'active' })
      .whereNull('deleted_at').first();
    if (!fromAccount) throw new NotFoundError('Source account', fromAccountId);

    const toAccount = await db(TABLES.ACCOUNTS)
      .where({ id: toAccountId, status: 'active' })
      .whereNull('deleted_at').first();
    if (!toAccount) throw new NotFoundError('Destination account', toAccountId);

    // Sufficient funds check
    if (parseFloat(fromAccount.available_balance) < amount) {
      throw new BusinessRuleError(
        `Insufficient funds. Available: $${fromAccount.available_balance}, Required: $${amount}.`,
        { available: fromAccount.available_balance, required: amount }
      );
    }

    const transactionId = uuidv4();

    // ── ATOMIC DATABASE TRANSACTION ──────────────────────────────────────────
    // All these steps succeed together or all fail together
    await db.transaction(async (trx: Knex.Transaction) => {
      // 1. Create the transaction record
      await trx(TABLES.TRANSACTIONS).insert({
        id:             transactionId,
        account_id:     fromAccountId,
        type:           'transfer',
        amount:         -amount,               // Negative = money going out
        currency,
        description:    description ?? `Transfer to ${toAccount.account_number}`,
        reference_id:   uuidv4(),
        status:         'completed',
        created_at:     new Date(),
      });

      // 2. Create the receiving side transaction record
      await trx(TABLES.TRANSACTIONS).insert({
        id:             uuidv4(),
        account_id:     toAccountId,
        type:           'transfer',
        amount:         +amount,               // Positive = money coming in
        currency,
        description:    `Transfer from ${fromAccount.account_number}`,
        reference_id:   transactionId,         // Links the two sides
        status:         'completed',
        created_at:     new Date(),
      });

      // 3. Debit the from-account
      await trx(TABLES.ACCOUNTS)
        .where({ id: fromAccountId })
        .decrement('balance',           amount)
        .decrement('available_balance', amount);

      // 4. Credit the to-account
      await trx(TABLES.ACCOUNTS)
        .where({ id: toAccountId })
        .increment('balance',           amount)
        .increment('available_balance', amount);
    }); // If any of the above fails, ALL are rolled back

    // Invalidate balance caches
    await Promise.all([
      cache.del(CACHE_KEYS.accountBalance(fromAccountId)),
      cache.del(CACHE_KEYS.accountBalance(toAccountId)),
      cache.del(CACHE_KEYS.userAccounts(user.id)),
    ]);

    // Record in Prometheus
    transactionsTotal.labels('transfer', currency, 'completed').inc();

    logger.info('Transfer completed', {
      transactionId,
      fromAccountId,
      toAccountId,
      amount,
      currency,
      userId: user.id,
    });

    return res.status(201).json({
      transactionId,
      status:      'completed',
      amount,
      currency,
      description: description ?? 'Transfer',
      timestamp:   new Date().toISOString(),
    });
  });

  // POST /api/v1/transactions/deposit
  router.post('/deposit', async (req: any, res) => {
    const { error, value } = depositSchema.validate(req.body);
    if (error) throw new ValidationError(error.details[0].message);

    const { db, cache, user } = req;

    const account = await db(TABLES.ACCOUNTS)
      .where({ id: value.accountId, user_id: user.id, status: 'active' })
      .whereNull('deleted_at').first();
    if (!account) throw new NotFoundError('Account', value.accountId);

    const transactionId = uuidv4();

    await db.transaction(async (trx: Knex.Transaction) => {
      await trx(TABLES.TRANSACTIONS).insert({
        id:          transactionId,
        account_id:  value.accountId,
        type:        'deposit',
        amount:      value.amount,
        currency:    value.currency,
        description: value.description ?? `Deposit via ${value.source}`,
        status:      'completed',
        created_at:  new Date(),
      });

      await trx(TABLES.ACCOUNTS).where({ id: value.accountId })
        .increment('balance',           value.amount)
        .increment('available_balance', value.amount);
    });

    await cache.del(CACHE_KEYS.accountBalance(value.accountId));
    transactionsTotal.labels('deposit', value.currency, 'completed').inc();

    return res.status(201).json({ transactionId, status: 'completed', amount: value.amount });
  });

  router.post('/withdrawal', async (req: any, res) => {
    const { error, value } = withdrawalSchema.validate(req.body);
    if (error) throw new ValidationError(error.details[0].message);

    const { db, cache, user } = req;

    const account = await db(TABLES.ACCOUNTS)
      .where({ id: value.accountId, user_id: user.id, status: 'active' })
      .whereNull('deleted_at').first();
    if (!account) throw new NotFoundError('Account', value.accountId);

    if (parseFloat(account.available_balance) < value.amount) {
      throw new ValidationError('Insufficient funds');
    }

    const transactionId = uuidv4();

    await db.transaction(async (trx: Knex.Transaction) => {
      await trx(TABLES.TRANSACTIONS).insert({
        id:          transactionId,
        account_id:  value.accountId,
        type:        'withdrawal',
        amount:      value.amount,
        currency:    value.currency,
        description: value.description ?? 'Bill payment',
        status:      'completed',
        created_at:  new Date(),
      });

      await trx(TABLES.ACCOUNTS).where({ id: value.accountId })
        .decrement('balance',           value.amount)
        .decrement('available_balance', value.amount);
    });

    await cache.del(CACHE_KEYS.accountBalance(value.accountId));
    transactionsTotal.labels('withdrawal', value.currency, 'completed').inc();

    return res.status(201).json({ transactionId, status: 'completed', amount: value.amount });
  });

  return router;
}
