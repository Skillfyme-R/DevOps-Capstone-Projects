exports.up = async function (knex) {
  await knex.schema.createTable('nexus_accounts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('nexus_users').onDelete('RESTRICT');
    table.string('account_number', 20).notNullable().unique();
    table.string('account_type', 20).notNullable();
    table.string('currency', 3).notNullable().defaultTo('USD');
    table.string('nickname', 50).nullable();
    table.decimal('balance', 19, 4).notNullable().defaultTo(0);
    table.decimal('available_balance', 19, 4).notNullable().defaultTo(0);
    table.decimal('interest_rate', 8, 6).notNullable().defaultTo(0);
    table.string('status', 20).notNullable().defaultTo('active');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.index(['user_id']);
    table.index(['account_number']);
    table.index(['status']);
  });

  await knex.schema.createTable('nexus_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('account_id').notNullable().references('id').inTable('nexus_accounts').onDelete('RESTRICT');
    table.string('type', 30).notNullable();
    table.decimal('amount', 19, 4).notNullable();
    table.string('currency', 3).notNullable().defaultTo('USD');
    table.string('description', 200).nullable();
    table.uuid('reference_id').nullable();
    table.string('external_ref', 100).nullable();
    table.string('status', 20).notNullable().defaultTo('completed');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.index(['account_id', 'created_at']);
    table.index(['type']);
    table.index(['reference_id']);
    table.index(['status']);
    table.index(['created_at']);
  });

  await knex.schema.createTable('nexus_audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').nullable().references('id').inTable('nexus_users').onDelete('SET NULL');
    table.string('action', 100).notNullable();
    table.string('resource_type', 50).nullable();
    table.uuid('resource_id').nullable();
    table.jsonb('details').nullable();
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 500).nullable();
    table.string('result', 20).defaultTo('success');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.index(['user_id', 'created_at']);
    table.index(['action']);
    table.index(['created_at']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('nexus_audit_logs');
  await knex.schema.dropTableIfExists('nexus_transactions');
  await knex.schema.dropTableIfExists('nexus_accounts');
};
