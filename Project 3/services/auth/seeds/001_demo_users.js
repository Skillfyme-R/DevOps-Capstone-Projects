const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

exports.seed = async function (knex) {
  await knex('mc_audit_logs').del();
  await knex('mc_refresh_tokens').del();
  await knex('mc_users').del();

  const hash = await bcrypt.hash('MediCore@2025!', 12);
  const facilityId = '00000000-0000-0000-0000-000000000001';

  await knex('mc_users').insert([
    {
      id: '10000000-0000-0000-0000-000000000001',
      email: 'superadmin@medicore.health',
      password_hash: hash,
      first_name: 'Super',
      last_name: 'Admin',
      role: 'superadmin',
      status: 'active',
      email_verified: true,
      mfa_enabled: false,
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      email: 'dr.smith@medicore.health',
      password_hash: hash,
      first_name: 'Dr. Emily',
      last_name: 'Smith',
      role: 'clinician',
      facility_id: facilityId,
      license_number: 'MD-2025-001',
      status: 'active',
      email_verified: true,
      mfa_enabled: false,
    },
    {
      id: '10000000-0000-0000-0000-000000000003',
      email: 'nurse.johnson@medicore.health',
      password_hash: hash,
      first_name: 'Sarah',
      last_name: 'Johnson',
      role: 'nurse',
      facility_id: facilityId,
      license_number: 'RN-2025-001',
      status: 'active',
      email_verified: true,
      mfa_enabled: false,
    },
    {
      id: '10000000-0000-0000-0000-000000000004',
      email: 'patient@medicore.health',
      password_hash: hash,
      first_name: 'John',
      last_name: 'Doe',
      role: 'patient',
      phone: '+1-555-0100',
      date_of_birth: '1985-06-15',
      status: 'active',
      email_verified: true,
      mfa_enabled: false,
    },
  ]);
};
