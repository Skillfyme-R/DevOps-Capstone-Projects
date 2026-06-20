exports.up = async function (knex) {
  await knex.schema.createTable('mc_patients', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('mrn', 20).notNullable().unique();
    t.string('first_name', 100).notNullable();
    t.string('last_name', 100).notNullable();
    t.date('date_of_birth').notNullable();
    t.enu('gender', ['male', 'female', 'other', 'unknown']).notNullable();
    t.string('email', 320).nullable();
    t.string('phone', 20).nullable();
    t.jsonb('address').nullable();
    t.enu('blood_group', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).nullable();
    t.enu('marital_status', ['single', 'married', 'divorced', 'widowed', 'unknown']).nullable();
    t.string('national_id', 50).nullable();
    t.jsonb('emergency_contact').nullable();
    t.jsonb('insurance_info').nullable();
    t.uuid('primary_physician_id').nullable();
    t.uuid('facility_id').nullable();
    t.uuid('user_id').nullable();
    t.uuid('registered_by').nullable();
    t.boolean('is_deleted').notNullable().defaultTo(false);
    t.timestamp('deleted_at').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamps(true, true);

    t.index('mrn');
    t.index('email');
    t.index('facility_id');
    t.index('primary_physician_id');
    t.index(['last_name', 'first_name']);
    t.index('is_deleted');
  });

  await knex.schema.createTable('mc_allergies', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('patient_id').notNullable().references('id').inTable('mc_patients').onDelete('CASCADE');
    t.string('substance').notNullable();
    t.enu('category', ['food', 'medication', 'environment', 'biologic', 'other']).notNullable();
    t.enu('severity', ['mild', 'moderate', 'severe', 'life_threatening']).notNullable();
    t.string('reaction').notNullable();
    t.enu('status', ['active', 'inactive', 'resolved']).notNullable().defaultTo('active');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.uuid('recorded_by').nullable();
    t.timestamps(true, true);

    t.index('patient_id');
    t.index('is_active');
  });

  await knex.schema.createTable('mc_conditions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('patient_id').notNullable().references('id').inTable('mc_patients').onDelete('CASCADE');
    t.string('icd10_code', 20).notNullable();
    t.string('description').notNullable();
    t.enu('category', ['chronic', 'acute', 'historical']).notNullable();
    t.enu('status', ['active', 'inactive', 'resolved', 'remission']).notNullable().defaultTo('active');
    t.date('onset_date').nullable();
    t.date('resolved_date').nullable();
    t.uuid('diagnosing_physician_id').nullable();
    t.text('notes').nullable();
    t.timestamps(true, true);

    t.index('patient_id');
    t.index('status');
    t.index('icd10_code');
  });

  await knex.schema.createTable('mc_medications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('patient_id').notNullable().references('id').inTable('mc_patients').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('generic_name').nullable();
    t.string('dosage').notNullable();
    t.string('frequency').notNullable();
    t.string('route', 50).notNullable();
    t.enu('status', ['active', 'discontinued', 'on_hold', 'completed']).notNullable().defaultTo('active');
    t.date('start_date').notNullable();
    t.date('end_date').nullable();
    t.uuid('prescribed_by').nullable();
    t.text('instructions').nullable();
    t.timestamps(true, true);

    t.index('patient_id');
    t.index('status');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('mc_medications');
  await knex.schema.dropTableIfExists('mc_conditions');
  await knex.schema.dropTableIfExists('mc_allergies');
  await knex.schema.dropTableIfExists('mc_patients');
};
