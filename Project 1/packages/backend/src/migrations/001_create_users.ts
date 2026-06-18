/**
 * Migration 001 — Create Users Table
 *
 * Migrations are database schema changes tracked as code.
 * Each migration has:
 *   up()   — apply the change (creates table)
 *   down() — revert the change (drops table)
 *
 * Run: yarn db:migrate
 * Undo: yarn db:rollback
 *
 * Why we use migrations instead of just editing the DB directly:
 *   - Every developer runs the same schema
 *   - Production DB changes are tracked in git
 *   - You can roll back a bad migration
 *   - CI/CD runs migrations automatically before deploying
 */

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('nexus_users', (table) => {
    // Primary key: UUID instead of auto-increment integer.
    // UUIDs don't reveal how many users you have (security through obscurity).
    // Also safe to generate on the client without DB roundtrip.
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Login credentials
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();

    // Personal information
    table.string('first_name', 100).notNullable();
    table.string('last_name',  100).notNullable();
    table.string('phone',      20).nullable();
    table.string('country',    2).defaultTo('US').notNullable();

    // Authorization
    table.text('roles').defaultTo('["customer"]');   // JSON array of roles
    table.integer('kyc_level').defaultTo(0).notNullable();  // 0-3

    // Account security
    table.string('status', 20).defaultTo('active').notNullable();  // active | suspended | closed
    table.integer('failed_login_attempts').defaultTo(0);
    table.timestamp('locked_until').nullable();

    // Metadata
    table.timestamp('last_login_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();  // Soft delete

    // Indexes for common queries
    table.index(['email']);          // Login lookup
    table.index(['status']);         // Filter active users
    table.index(['created_at']);     // Date range queries
  });

  // Auto-update updated_at on every UPDATE (PostgreSQL trigger)
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_nexus_users_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER nexus_users_updated_at
    BEFORE UPDATE ON nexus_users
    FOR EACH ROW EXECUTE FUNCTION update_nexus_users_updated_at();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS nexus_users_updated_at ON nexus_users');
  await knex.raw('DROP FUNCTION IF EXISTS update_nexus_users_updated_at');
  await knex.schema.dropTableIfExists('nexus_users');
}
