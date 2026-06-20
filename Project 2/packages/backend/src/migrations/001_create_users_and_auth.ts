import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Users table — shoppers, vendors, admins
  await knex.schema.createTable('vv_users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 100).notNullable();
    t.string('email', 255).notNullable().unique();
    t.string('password_hash', 255).nullable();
    t.enum('role', ['customer', 'vendor', 'admin']).notNullable().defaultTo('customer');
    t.string('avatar_url', 500).nullable();
    t.string('phone', 20).nullable();
    t.date('date_of_birth').nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.boolean('email_verified').notNullable().defaultTo(false);
    t.timestamp('email_verified_at').nullable();
    t.timestamp('last_login_at').nullable();
    t.timestamps(true, true);
  });

  // Shipping addresses
  await knex.schema.createTable('vv_user_addresses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('vv_users').onDelete('CASCADE');
    t.string('label', 50).defaultTo('Home');
    t.string('full_name', 100).notNullable();
    t.string('street', 255).notNullable();
    t.string('city', 100).notNullable();
    t.string('state', 100).notNullable();
    t.string('zip', 20).notNullable();
    t.string('country', 2).notNullable().defaultTo('US');
    t.string('phone', 20).nullable();
    t.boolean('is_default').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });

  // OAuth provider links (Google, GitHub)
  await knex.schema.createTable('vv_oauth_providers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('vv_users').onDelete('CASCADE');
    t.string('provider', 50).notNullable();
    t.string('provider_user_id', 255).notNullable();
    t.jsonb('provider_data').nullable();
    t.timestamps(true, true);
    t.unique(['provider', 'provider_user_id']);
  });

  // Sessions for Redis fallback tracking
  await knex.schema.createTable('vv_user_sessions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('vv_users').onDelete('CASCADE');
    t.string('ip_address', 45).nullable();
    t.text('user_agent').nullable();
    t.timestamp('expires_at').notNullable();
    t.timestamps(true, true);
  });

  // Audit log
  await knex.schema.createTable('vv_audit_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('entity_type', 50).notNullable();
    t.uuid('entity_id').nullable();
    t.string('action', 100).notNullable();
    t.uuid('actor_id').nullable();
    t.jsonb('changes').nullable();
    t.string('ip_address', 45).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['entity_type', 'entity_id']);
    t.index(['actor_id']);
    t.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('vv_audit_logs');
  await knex.schema.dropTableIfExists('vv_user_sessions');
  await knex.schema.dropTableIfExists('vv_oauth_providers');
  await knex.schema.dropTableIfExists('vv_user_addresses');
  await knex.schema.dropTableIfExists('vv_users');
}
