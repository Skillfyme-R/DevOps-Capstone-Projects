/**
 * NexusFinance Database Service
 *
 * Creates a Knex connection pool to PostgreSQL.
 * A "pool" means we maintain several open connections
 * so requests don't have to wait to connect — they reuse existing ones.
 *
 * We also define all table names as constants here.
 * This prevents typos like "nexus_acocunts" from causing runtime errors.
 */

import knex, { Knex } from 'knex';
import { NexusConfig } from '../config/loader';
import { createLogger } from '../utils/logger';

const logger = createLogger('nexus-database');

export type Database = Knex; // Re-export for use in routes

export async function createDatabase(config: NexusConfig): Promise<Database> {
  const dbConf = config.backend?.database;

  const db = knex({
    client: dbConf?.client ?? 'pg',
    connection: {
      host:     dbConf?.connection?.host     ?? 'localhost',
      port:     Number(dbConf?.connection?.port ?? 5432),
      user:     dbConf?.connection?.user     ?? 'nexus_user',
      password: dbConf?.connection?.password,
      database: dbConf?.connection?.database ?? 'nexusfinance_dev',
      ssl:      dbConf?.connection?.ssl,
    },
    pool: {
      min: dbConf?.pool?.min ?? 2,
      max: dbConf?.pool?.max ?? 20,
      // How long to wait for an available connection before throwing
      acquireTimeoutMillis: 30_000,
      // How long an idle connection stays open before being closed
      idleTimeoutMillis: 600_000,
    },
    // Log every SQL query in development (helps you see what's happening)
    debug: process.env.NEXUS_ENVIRONMENT === 'development' && process.env.SQL_DEBUG === 'true',
  });

  // Test the connection immediately — fail fast if DB is unreachable
  try {
    await db.raw('SELECT 1 + 1 AS connection_test');
    logger.info(`✓ Connected to PostgreSQL: ${dbConf?.connection?.database}`);
  } catch (error) {
    logger.error('✗ Failed to connect to PostgreSQL', { error });
    throw error; // Crash the server — can't run without a database
  }

  return db;
}

// ── Table Name Constants ────────────────────────────────────────────────────
// All database table names in one place.
// Rule: NEVER use a string literal 'nexus_accounts' in query code.
// ALWAYS use TABLES.ACCOUNTS — so if you rename a table, you change it here once.

export const TABLES = {
  // Core banking
  USERS:         'nexus_users',
  ACCOUNTS:      'nexus_accounts',
  TRANSACTIONS:  'nexus_transactions',
  TRANSFERS:     'nexus_transfers',

  // Lending
  LOAN_APPLICATIONS: 'nexus_loan_applications',
  LOANS:             'nexus_loans',
  LOAN_PAYMENTS:     'nexus_loan_payments',
  LOAN_SCHEDULES:    'nexus_loan_schedules',

  // Payments
  PAYMENTS:          'nexus_payments',
  PAYMENT_METHODS:   'nexus_payment_methods',
  BENEFICIARIES:     'nexus_beneficiaries',

  // Analytics & Budgeting
  BUDGETS:       'nexus_budgets',
  CATEGORIES:    'nexus_categories',
  PORTFOLIO:     'nexus_portfolio',
  HOLDINGS:      'nexus_holdings',

  // Compliance & Security
  KYC_RECORDS:   'nexus_kyc_records',
  AML_CHECKS:    'nexus_aml_checks',
  FRAUD_ALERTS:  'nexus_fraud_alerts',
  AUDIT_LOGS:    'nexus_audit_logs',

  // System
  NOTIFICATIONS:    'nexus_notifications',
  EXCHANGE_RATES:   'nexus_exchange_rates',
  SESSIONS:         'nexus_sessions',
  MIGRATIONS:       'nexus_migrations', // Knex migration tracking table
} as const; // 'as const' makes these values immutable strings

export type TableName = typeof TABLES[keyof typeof TABLES];
