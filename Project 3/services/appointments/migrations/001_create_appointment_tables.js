exports.up = async function (knex) {
  await knex.schema.createTable('mc_appointments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('patient_id').notNullable();
    t.uuid('physician_id').notNullable();
    t.uuid('facility_id').notNullable();
    t.enu('type', ['consultation', 'follow_up', 'procedure', 'lab', 'imaging', 'telemedicine', 'emergency']).notNullable();
    t.timestamp('scheduled_at').notNullable();
    t.integer('duration_minutes').notNullable().defaultTo(30);
    t.string('chief_complaint', 500).nullable();
    t.text('notes').nullable();
    t.boolean('is_telemedicine').notNullable().defaultTo(false);
    t.string('telemedicine_link').nullable();
    t.string('room_number', 20).nullable();
    t.enu('priority', ['routine', 'urgent', 'emergency']).notNullable().defaultTo('routine');
    t.enu('status', ['scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'no_show', 'cancelled']).notNullable().defaultTo('scheduled');
    t.boolean('is_cancelled').notNullable().defaultTo(false);
    t.string('cancellation_reason').nullable();
    t.timestamp('cancelled_at').nullable();
    t.uuid('booked_by').nullable();
    t.jsonb('reminders_sent').defaultTo('[]');
    t.timestamps(true, true);

    t.index('patient_id');
    t.index('physician_id');
    t.index('facility_id');
    t.index('scheduled_at');
    t.index('status');
    t.index('is_cancelled');
  });

  await knex.schema.createTable('mc_appointment_reminders', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('appointment_id').notNullable().references('id').inTable('mc_appointments').onDelete('CASCADE');
    t.enu('channel', ['sms', 'email', 'push']).notNullable();
    t.enu('status', ['pending', 'sent', 'failed']).notNullable().defaultTo('pending');
    t.timestamp('scheduled_for').notNullable();
    t.timestamp('sent_at').nullable();
    t.timestamps(true, true);

    t.index('appointment_id');
    t.index('status');
    t.index('scheduled_for');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('mc_appointment_reminders');
  await knex.schema.dropTableIfExists('mc_appointments');
};
