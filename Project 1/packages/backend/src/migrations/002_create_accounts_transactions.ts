/**
 * Migration 002 — Create Accounts and Transactions Tables
 *
 * These two tables are the core of the banking platform.
 * Every dollar amount in the system flows through these tables.
 *
 * Double-entry bookkeeping:
 *   Every transaction has equal debits and credits.
 *   A $100 transfer from Account A to Account B creates TWO rows:
 *     Row 1: account_id=A, amount=-100 (debit)
 *     Row 2: account_id=B, amount=+100 (credit)
 *   Sum of all transactions for an account = current balance
 */

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── Accounts Table ────────────────────────────────────────────────────────
  await knex.schema.createTable('nexus_accounts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('nexus_users').onDelete('RESTRICT');

    // Account identification
    table.string('account_number', 20).notNullable().unique();  // NX5837291045
    table.string('account_type', 20).notNullable();             // checking | savings | investment | credit
    table.string('currency', 3).notNullable().defaultTo('USD');
    table.string('nickname', 50).nullable();

    // Financial data — stored as DECIMAL(19,4) for precision
    // NEVER use FLOAT for money! Floating point math has rounding errors.
    // 0.1 + 0.2 = 0.30000000000000004 in floating point.
    table.decimal('balance',           19, 4).notNullable().defaultTo(0);
    table.decimal('available_balance', 19, 4).notNullable().defaultTo(0);  // balance - pending holds

    // Account parameters
    table.decimal('interest_rate', 8, 6).notNullable().defaultTo(0);  // Annual rate (0.045 = 4.5%)
    table.string('status', 20).notNullable().defaultTo('active');      // active | frozen | closed

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    // Prevent balance from going below zero (check constraint)
    // Note: enforced at application level too, but DB is the last line of defense
    table.check('balance >= -50000', [], 'nexus_accounts_balance_check');  // Allow small overdraft

    table.index(['user_id']);
    table.index(['account_number']);
    table.index(['status']);
  });

  // ── Transactions Table ────────────────────────────────────────────────────
  await knex.schema.createTable('nexus_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('account_id').notNullable().references('id').inTable('nexus_accounts').onDelete('RESTRICT');

    // Transaction details
    table.string('type', 30).notNullable();        // deposit | withdrawal | transfer | payment | fee | interest | refund
    table.decimal('amount', 19, 4).notNullable();  // Positive = credit (money in), Negative = debit (money out)
    table.string('currency', 3).notNullable().defaultTo('USD');
    table.string('description', 200).nullable();

    // Linking: reference_id links two sides of a transfer
    table.uuid('reference_id').nullable();         // Links debit + credit sides of a transfer
    table.string('external_ref', 100).nullable();  // Stripe payment ID, Plaid transaction ID, etc.

    // Status tracking
    table.string('status', 20).notNullable().defaultTo('completed');  // pending | completed | failed | reversed

    // Immutable record — transactions are NEVER updated or deleted
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    // No updated_at or deleted_at — transaction records must be immutable for compliance

    table.index(['account_id', 'created_at']);   // Most common query: account's transactions by date
    table.index(['type']);
    table.index(['reference_id']);
    table.index(['status']);
    table.index(['created_at']);
  });

  // ── Audit Logs Table ──────────────────────────────────────────────────────
  await knex.schema.createTable('nexus_audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').nullable().references('id').inTable('nexus_users').onDelete('SET NULL');
    table.string('action', 100).notNullable();       // user.login | account.create | transfer.initiate
    table.string('resource_type', 50).nullable();    // user | account | transaction | loan
    table.uuid('resource_id').nullable();
    table.jsonb('details').nullable();               // Extra context (request body, before/after state)
    table.string('ip_address', 45).nullable();       // IPv4 or IPv6
    table.string('user_agent', 500).nullable();
    table.string('result', 20).defaultTo('success'); // success | failure | blocked
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    // Audit logs: no update, no delete — ever

    table.index(['user_id', 'created_at']);
    table.index(['action']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('nexus_audit_logs');
  await knex.schema.dropTableIfExists('nexus_transactions');
  await knex.schema.dropTableIfExists('nexus_accounts');
}
