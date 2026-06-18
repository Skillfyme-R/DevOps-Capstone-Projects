/**
 * Migration 003 — Loans System Tables
 *
 * Three tables for the lending lifecycle:
 *   1. nexus_loan_applications — Initial application (may be rejected)
 *   2. nexus_loans             — Approved, active loans
 *   3. nexus_loan_schedules    — Monthly payment schedule (amortization table)
 */

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── Loan Applications ───────────────────────────────────────────────────
  await knex.schema.createTable('nexus_loan_applications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('nexus_users').onDelete('RESTRICT');

    table.string('loan_type', 30).notNullable();          // personal | auto | mortgage | student
    table.decimal('requested_amount', 19, 4).notNullable();
    table.integer('term_months').notNullable();
    table.text('purpose').notNullable();
    table.decimal('annual_income', 19, 4).notNullable();
    table.string('employment_status', 30).notNullable();

    // Risk assessment
    table.integer('credit_score').nullable();             // Self-reported or pulled from bureau
    table.decimal('calculated_rate', 8, 6).nullable();    // APR offered
    table.decimal('dti_ratio', 8, 6).nullable();          // Debt-to-income ratio

    table.string('status', 30).defaultTo('under_review'); // under_review | approved | rejected | withdrawn
    table.text('rejection_reason').nullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('reviewed_at').nullable();
    table.index(['user_id', 'status']);
  });

  // ── Active Loans ────────────────────────────────────────────────────────
  await knex.schema.createTable('nexus_loans', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('nexus_users').onDelete('RESTRICT');
    table.uuid('application_id').notNullable().references('id').inTable('nexus_loan_applications');

    table.string('loan_type', 30).notNullable();
    table.decimal('principal_amount',    19, 4).notNullable(); // Original loan amount
    table.decimal('outstanding_balance', 19, 4).notNullable(); // Remaining balance
    table.decimal('interest_rate',       8, 6).notNullable();  // Annual rate
    table.integer('term_months').notNullable();
    table.decimal('monthly_payment',     19, 4).notNullable();

    table.string('status', 30).defaultTo('approved');  // approved | active | paid_off | defaulted
    table.integer('missed_payments').defaultTo(0);
    table.timestamp('next_payment_date').nullable();
    table.timestamp('paid_off_date').nullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['user_id', 'status']);
  });

  // ── Loan Payment Schedule (Amortization Table) ──────────────────────────
  await knex.schema.createTable('nexus_loan_schedules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('loan_id').notNullable().references('id').inTable('nexus_loans').onDelete('CASCADE');

    table.integer('payment_number').notNullable();      // 1, 2, 3... up to term_months
    table.timestamp('due_date').notNullable();
    table.decimal('payment_amount',    19, 4).notNullable();  // Total payment
    table.decimal('principal_amount',  19, 4).notNullable();  // Portion going to principal
    table.decimal('interest_amount',   19, 4).notNullable();  // Portion going to interest
    table.decimal('remaining_balance', 19, 4).notNullable();  // Balance after this payment

    table.string('status', 20).defaultTo('pending');    // pending | paid | overdue | waived
    table.timestamp('paid_at').nullable();

    table.index(['loan_id', 'due_date']);
    table.index(['status', 'due_date']);  // Find all overdue payments
  });

  // ── Payments Table ──────────────────────────────────────────────────────
  await knex.schema.createTable('nexus_payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('nexus_users').onDelete('RESTRICT');
    table.uuid('account_id').notNullable().references('id').inTable('nexus_accounts').onDelete('RESTRICT');

    table.string('stripe_payment_id', 100).nullable().unique();
    table.decimal('amount', 19, 4).notNullable();
    table.string('currency', 3).notNullable().defaultTo('USD');
    table.string('status', 20).notNullable().defaultTo('pending');  // pending | completed | failed | refunded
    table.text('description').nullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
    table.timestamp('failed_at').nullable();

    table.index(['user_id', 'created_at']);
    table.index(['status']);
  });

  // ── Payment Methods ─────────────────────────────────────────────────────
  await knex.schema.createTable('nexus_payment_methods', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('nexus_users').onDelete('CASCADE');

    table.string('type', 20).notNullable();       // card | bank_account | digital_wallet
    table.string('last_four', 4).nullable();       // Last 4 digits (safe to store)
    table.string('brand', 20).nullable();          // visa | mastercard | amex | ach
    table.string('nickname', 50).nullable();
    table.boolean('is_default').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.string('stripe_pm_id', 100).nullable();  // Stripe stores the actual card data

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('nexus_payment_methods');
  await knex.schema.dropTableIfExists('nexus_payments');
  await knex.schema.dropTableIfExists('nexus_loan_schedules');
  await knex.schema.dropTableIfExists('nexus_loans');
  await knex.schema.dropTableIfExists('nexus_loan_applications');
}
