exports.up = async function (knex) {
  await knex.schema.createTable('nexus_users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('phone', 20).nullable();
    table.string('country', 2).defaultTo('US').notNullable();
    table.text('roles').defaultTo('["customer"]');
    table.integer('kyc_level').defaultTo(0).notNullable();
    table.string('status', 20).defaultTo('active').notNullable();
    table.integer('failed_login_attempts').defaultTo(0);
    table.timestamp('locked_until').nullable();
    table.timestamp('last_login_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.index(['email']);
    table.index(['status']);
    table.index(['created_at']);
  });

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
};

exports.down = async function (knex) {
  await knex.raw('DROP TRIGGER IF EXISTS nexus_users_updated_at ON nexus_users');
  await knex.raw('DROP FUNCTION IF EXISTS update_nexus_users_updated_at');
  await knex.schema.dropTableIfExists('nexus_users');
};
