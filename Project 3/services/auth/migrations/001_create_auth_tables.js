exports.up = async function (knex) {
  await knex.schema.createTable('mc_users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('email', 320).notNullable().unique();
    t.string('password_hash').notNullable();
    t.string('first_name', 100).notNullable();
    t.string('last_name', 100).notNullable();
    t.enu('role', ['patient', 'clinician', 'nurse', 'admin', 'superadmin']).notNullable().defaultTo('patient');
    t.uuid('facility_id').nullable();
    t.string('phone', 20).nullable();
    t.date('date_of_birth').nullable();
    t.string('license_number', 100).nullable();
    t.enu('status', ['active', 'inactive', 'locked', 'pending_verification']).notNullable().defaultTo('pending_verification');
    t.boolean('email_verified').notNullable().defaultTo(false);
    t.boolean('mfa_enabled').notNullable().defaultTo(false);
    t.string('mfa_secret').nullable();
    t.integer('failed_login_attempts').notNullable().defaultTo(0);
    t.timestamp('locked_until').nullable();
    t.timestamp('last_login_at').nullable();
    t.string('password_reset_token').nullable();
    t.timestamp('password_reset_expires').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamps(true, true);

    t.index('email');
    t.index('role');
    t.index('status');
    t.index('facility_id');
  });

  await knex.schema.createTable('mc_refresh_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('mc_users').onDelete('CASCADE');
    t.string('token_hash').notNullable();
    t.string('device_info').nullable();
    t.string('ip_address', 45).nullable();
    t.boolean('is_revoked').notNullable().defaultTo(false);
    t.timestamp('expires_at').notNullable();
    t.timestamps(true, true);

    t.index('user_id');
    t.index('token_hash');
  });

  await knex.schema.createTable('mc_audit_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('actor_id').nullable();
    t.string('action', 100).notNullable();
    t.string('entity_type', 50).nullable();
    t.uuid('entity_id').nullable();
    t.jsonb('changes').defaultTo('{}');
    t.string('ip_address', 45).nullable();
    t.string('user_agent').nullable();
    t.string('request_id', 50).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index('actor_id');
    t.index('action');
    t.index(['entity_type', 'entity_id']);
    t.index('created_at');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('mc_audit_logs');
  await knex.schema.dropTableIfExists('mc_refresh_tokens');
  await knex.schema.dropTableIfExists('mc_users');
};
