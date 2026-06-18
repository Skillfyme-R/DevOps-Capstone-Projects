exports.up = async function (knex) {
  await knex.schema.createTable('nexus_loan_applications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('nexus_users').onDelete('RESTRICT');
    table.string('loan_type', 30).notNullable();
    table.decimal('requested_amount', 19, 4).notNullable();
    table.integer('term_months').notNullable();
    table.text('purpose').notNullable();
    table.decimal('annual_income', 19, 4).notNullable();
    table.string('employment_status', 30).notNullable();
    table.integer('credit_score').nullable();
    table.decimal('calculated_rate', 8, 6).nullable();
    table.decimal('dti_ratio', 8, 6).nullable();
    table.string('status', 30).defaultTo('under_review');
    table.text('rejection_reason').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('reviewed_at').nullable();
    table.index(['user_id', 'status']);
  });

  await knex.schema.createTable('nexus_loans', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('nexus_users').onDelete('RESTRICT');
    table.uuid('application_id').notNullable().references('id').inTable('nexus_loan_applications');
    table.string('loan_type', 30).notNullable();
    table.decimal('principal_amount', 19, 4).notNullable();
    table.decimal('outstanding_balance', 19, 4).notNullable();
    table.decimal('interest_rate', 8, 6).notNullable();
    table.integer('term_months').notNullable();
    table.decimal('monthly_payment', 19, 4).notNullable();
    table.string('status', 30).defaultTo('approved');
    table.integer('missed_payments').defaultTo(0);
    table.timestamp('next_payment_date').nullable();
    table.timestamp('paid_off_date').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['user_id', 'status']);
  });

  await knex.schema.createTable('nexus_loan_schedules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('loan_id').notNullable().references('id').inTable('nexus_loans').onDelete('CASCADE');
    table.integer('payment_number').notNullable();
    table.timestamp('due_date').notNullable();
    table.decimal('payment_amount', 19, 4).notNullable();
    table.decimal('principal_amount', 19, 4).notNullable();
    table.decimal('interest_amount', 19, 4).notNullable();
    table.decimal('remaining_balance', 19, 4).notNullable();
    table.string('status', 20).defaultTo('pending');
    table.timestamp('paid_at').nullable();
    table.index(['loan_id', 'due_date']);
    table.index(['status', 'due_date']);
  });

  await knex.schema.createTable('nexus_payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('nexus_users').onDelete('RESTRICT');
    table.uuid('account_id').notNullable().references('id').inTable('nexus_accounts').onDelete('RESTRICT');
    table.string('stripe_payment_id', 100).nullable().unique();
    table.decimal('amount', 19, 4).notNullable();
    table.string('currency', 3).notNullable().defaultTo('USD');
    table.string('status', 20).notNullable().defaultTo('pending');
    table.text('description').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
    table.timestamp('failed_at').nullable();
    table.index(['user_id', 'created_at']);
    table.index(['status']);
  });

  await knex.schema.createTable('nexus_payment_methods', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('nexus_users').onDelete('CASCADE');
    table.string('type', 20).notNullable();
    table.string('last_four', 4).nullable();
    table.string('brand', 20).nullable();
    table.string('nickname', 50).nullable();
    table.boolean('is_default').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.string('stripe_pm_id', 100).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['user_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('nexus_payment_methods');
  await knex.schema.dropTableIfExists('nexus_payments');
  await knex.schema.dropTableIfExists('nexus_loan_schedules');
  await knex.schema.dropTableIfExists('nexus_loans');
  await knex.schema.dropTableIfExists('nexus_loan_applications');
};
