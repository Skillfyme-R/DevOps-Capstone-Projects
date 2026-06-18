/**
 * NexusFinance Accounts API
 *
 * A "bank account" in NexusFinance. Users can have multiple accounts:
 *   - checking    — everyday spending, debit card linked
 *   - savings     — earns interest, limited withdrawals
 *   - investment  — linked to investment portfolio
 *   - credit      — credit card/line of credit
 *
 * GET    /api/v1/accounts          — List all accounts for the user
 * GET    /api/v1/accounts/:id      — Single account details
 * POST   /api/v1/accounts          — Open a new account
 * PATCH  /api/v1/accounts/:id      — Update nickname or settings
 * DELETE /api/v1/accounts/:id      — Close account (soft delete)
 * GET    /api/v1/accounts/:id/statement — Monthly statement PDF
 */

import Router from 'express-promise-router';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

import { TABLES }        from '../../services/database';
import { CACHE_KEYS, CACHE_TTL } from '../../services/cache';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../middleware/errorHandler';
import { createLogger }  from '../../utils/logger';

const logger = createLogger('nexus-accounts');

const createAccountSchema = Joi.object({
  accountType: Joi.string().valid('checking', 'savings', 'investment', 'credit').required(),
  currency:    Joi.string().length(3).uppercase().default('USD'),
  nickname:    Joi.string().max(50).optional().allow(''),
});

export function accountRoutes() {
  const router = Router();

  // GET /api/v1/accounts
  router.get('/', async (req: any, res) => {
    const { db, cache, user } = req;

    // Try cache first (avoids hitting DB on every page load)
    const cacheKey = CACHE_KEYS.userAccounts(user.id);
    const cached   = await cache.get(cacheKey);
    if (cached) {
      return res.json({ accounts: JSON.parse(cached), source: 'cache' });
    }

    const accounts = await db(TABLES.ACCOUNTS)
      .where({ user_id: user.id })
      .whereNull('deleted_at')       // Exclude closed accounts
      .select(
        'id', 'account_number', 'account_type', 'currency',
        'balance', 'available_balance', 'nickname', 'status',
        'interest_rate', 'created_at'
      )
      .orderBy('created_at', 'asc');

    // Enrich with real-time balance from cache if available
    const enriched = await Promise.all(
      accounts.map(async (acc: any) => {
        const balanceCached = await cache.get(CACHE_KEYS.accountBalance(acc.id));
        return {
          ...acc,
          balance:           balanceCached ? parseFloat(balanceCached) : parseFloat(acc.balance),
          formattedBalance:  formatCurrency(parseFloat(acc.balance), acc.currency),
        };
      })
    );

    // Cache the result for 60 seconds
    await cache.setEx(cacheKey, CACHE_TTL.USER_ACCOUNTS, JSON.stringify(enriched));

    logger.info('Accounts listed', { userId: user.id, count: enriched.length });
    return res.json({ accounts: enriched, total: enriched.length });
  });

  // GET /api/v1/accounts/:id
  router.get('/:id', async (req: any, res) => {
    const { db, user } = req;

    const account = await db(TABLES.ACCOUNTS)
      .where({ id: req.params.id, user_id: user.id })
      .whereNull('deleted_at')
      .first();

    if (!account) throw new NotFoundError('Account', req.params.id);

    return res.json({
      ...account,
      formattedBalance: formatCurrency(parseFloat(account.balance), account.currency),
    });
  });

  // POST /api/v1/accounts — Open a new account
  router.post('/', async (req: any, res) => {
    const { error, value } = createAccountSchema.validate(req.body);
    if (error) throw new ValidationError(error.details[0].message);

    const { db, user } = req;

    // Business rule: max 5 accounts per user
    const existingCount = await db(TABLES.ACCOUNTS)
      .where({ user_id: user.id })
      .whereNull('deleted_at')
      .count('id as count')
      .first();

    if (Number(existingCount?.count ?? 0) >= 5) {
      throw new BusinessRuleError('Maximum of 5 accounts allowed per customer.', { current: existingCount?.count, max: 5 });
    }

    const accountNumber = generateAccountNumber();
    const interestRate  = getInterestRate(value.accountType);

    const [account] = await db(TABLES.ACCOUNTS).insert({
      id:                uuidv4(),
      user_id:           user.id,
      account_number:    accountNumber,
      account_type:      value.accountType,
      currency:          value.currency,
      balance:           0,
      available_balance: 0,
      nickname:          value.nickname ?? null,
      status:            'active',
      interest_rate:     interestRate,
      created_at:        new Date(),
      updated_at:        new Date(),
    }).returning('*');

    logger.info('Account opened', { userId: user.id, accountId: account.id, type: value.accountType });
    return res.status(201).json(account);
  });

  // PATCH /api/v1/accounts/:id
  router.patch('/:id', async (req: any, res) => {
    const { db, cache, user } = req;

    const account = await db(TABLES.ACCOUNTS)
      .where({ id: req.params.id, user_id: user.id })
      .whereNull('deleted_at')
      .first();

    if (!account) throw new NotFoundError('Account', req.params.id);

    const allowed = ['nickname'];   // Only these fields can be updated by the user
    const updates: any = { updated_at: new Date() };
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const [updated] = await db(TABLES.ACCOUNTS)
      .where({ id: req.params.id })
      .update(updates)
      .returning('*');

    // Invalidate cache
    await cache.del(CACHE_KEYS.userAccounts(user.id));

    return res.json(updated);
  });

  // DELETE /api/v1/accounts/:id — Close account (soft delete: set deleted_at, not remove)
  router.delete('/:id', async (req: any, res) => {
    const { db, user } = req;

    const account = await db(TABLES.ACCOUNTS)
      .where({ id: req.params.id, user_id: user.id })
      .whereNull('deleted_at')
      .first();

    if (!account) throw new NotFoundError('Account', req.params.id);

    // Can't close account with remaining balance
    if (parseFloat(account.balance) !== 0) {
      throw new BusinessRuleError(
        `Cannot close account with non-zero balance. Current balance: ${formatCurrency(account.balance, account.currency)}. Please withdraw or transfer all funds first.`,
        { balance: account.balance, currency: account.currency }
      );
    }

    await db(TABLES.ACCOUNTS).where({ id: req.params.id }).update({
      status:     'closed',
      deleted_at: new Date(),
      updated_at: new Date(),
    });

    // Clear Redis cache so accounts list refreshes immediately
    const { cache } = req;
    await cache.del(CACHE_KEYS.userAccounts(user.id));

    logger.info('Account closed', { userId: user.id, accountId: req.params.id });
    return res.status(204).send();
  });

  return router;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateAccountNumber(): string {
  // Format: NX + 10 digits (e.g., NX5837291045)
  const digits = Math.floor(Math.random() * 9_000_000_000) + 1_000_000_000;
  return `NX${digits}`;
}

function getInterestRate(accountType: string): number {
  const rates: Record<string, number> = {
    checking:   0.0025,  // 0.25% APY
    savings:    0.0450,  // 4.50% APY (competitive savings rate)
    investment: 0,       // Managed by investment engine
    credit:     0.2499,  // 24.99% APR
  };
  return rates[accountType] ?? 0;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}
