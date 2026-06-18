const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

exports.seed = async function (knex) {
  if (process.env.NEXUS_ENVIRONMENT === 'production') {
    throw new Error('DANGER: Refusing to run seed data in production!');
  }

  await knex('nexus_loan_schedules').del();
  await knex('nexus_loans').del();
  await knex('nexus_loan_applications').del();
  await knex('nexus_transactions').del();
  await knex('nexus_accounts').del();
  await knex('nexus_audit_logs').del();
  await knex('nexus_users').del();

  console.log('✓ Cleared existing data');

  const passwordHash = await bcrypt.hash('password123', 10);

  const alexId  = uuidv4();
  const sarahId = uuidv4();
  const adminId = uuidv4();

  await knex('nexus_users').insert([
    {
      id:            alexId,
      email:         'alex.johnson@demo.nexusfinance.io',
      password_hash: passwordHash,
      first_name:    'Alex',
      last_name:     'Johnson',
      phone:         '+15551234567',
      country:       'US',
      roles:         JSON.stringify(['customer']),
      kyc_level:     2,
      status:        'active',
      created_at:    new Date('2023-06-01'),
    },
    {
      id:            sarahId,
      email:         'sarah.chen@demo.nexusfinance.io',
      password_hash: passwordHash,
      first_name:    'Sarah',
      last_name:     'Chen',
      phone:         '+15559876543',
      country:       'US',
      roles:         JSON.stringify(['customer', 'analyst']),
      kyc_level:     3,
      status:        'active',
      created_at:    new Date('2023-03-15'),
    },
    {
      id:            adminId,
      email:         'admin@nexusfinance.io',
      password_hash: passwordHash,
      first_name:    'Platform',
      last_name:     'Admin',
      country:       'US',
      roles:         JSON.stringify(['customer', 'analyst', 'admin', 'compliance']),
      kyc_level:     3,
      status:        'active',
      created_at:    new Date('2023-01-01'),
    },
  ]);
  console.log('✓ Created 3 demo users');

  const alexCheckingId  = uuidv4();
  const alexSavingsId   = uuidv4();
  const sarahCheckingId = uuidv4();

  await knex('nexus_accounts').insert([
    {
      id:                alexCheckingId,
      user_id:           alexId,
      account_number:    'NX7829403651',
      account_type:      'checking',
      currency:          'USD',
      balance:           12450.00,
      available_balance: 12450.00,
      nickname:          'Main Checking',
      interest_rate:     0.0025,
      status:            'active',
      created_at:        new Date('2023-06-01'),
    },
    {
      id:                alexSavingsId,
      user_id:           alexId,
      account_number:    'NX8834521907',
      account_type:      'savings',
      currency:          'USD',
      balance:           45000.00,
      available_balance: 45000.00,
      nickname:          'Emergency Fund',
      interest_rate:     0.045,
      status:            'active',
      created_at:        new Date('2023-06-01'),
    },
    {
      id:                sarahCheckingId,
      user_id:           sarahId,
      account_number:    'NX9901234578',
      account_type:      'checking',
      currency:          'USD',
      balance:           28750.50,
      available_balance: 28750.50,
      nickname:          'Primary Account',
      interest_rate:     0.0025,
      status:            'active',
      created_at:        new Date('2023-03-15'),
    },
  ]);
  console.log('✓ Created 3 demo accounts');

  const txTypes = [
    { type: 'deposit',    amount: 5500,    description: 'Salary Deposit — TechCorp Inc.' },
    { type: 'withdrawal', amount: -1200,   description: 'Rent Payment — Oak Street Apartments' },
    { type: 'payment',    amount: -89.99,  description: 'Netflix · Apple One Bundle' },
    { type: 'payment',    amount: -234.50, description: 'Grocery Store — Whole Foods' },
    { type: 'payment',    amount: -45.00,  description: 'Gas Station — Shell #4821' },
    { type: 'deposit',    amount: 250,     description: 'Freelance Payment — Design Project' },
    { type: 'payment',    amount: -120.00, description: 'Electricity Bill — ConEd' },
    { type: 'payment',    amount: -60.00,  description: 'Internet — Comcast' },
    { type: 'interest',   amount: 28.12,   description: 'Monthly Interest — Savings Account' },
    { type: 'payment',    amount: -350.00, description: 'Flight Booking — Delta Airlines' },
  ];

  const today = new Date();
  const txRows = [];
  for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
    for (const tx of txTypes) {
      const date = new Date();
      date.setMonth(date.getMonth() - monthOffset);
      // For current month, don't go past today's date
      const maxDay = monthOffset === 0 ? today.getDate() : 28;
      date.setDate(Math.floor(Math.random() * maxDay) + 1);
      txRows.push({
        id:          uuidv4(),
        account_id:  alexCheckingId,
        type:        tx.type,
        amount:      tx.amount,
        currency:    'USD',
        description: tx.description,
        status:      'completed',
        created_at:  date,
      });
    }
  }
  await knex('nexus_transactions').insert(txRows);
  console.log(`✓ Created ${txRows.length} sample transactions`);

  const loanAppId = uuidv4();
  const loanId    = uuidv4();

  await knex('nexus_loan_applications').insert({
    id:                loanAppId,
    user_id:           alexId,
    loan_type:         'personal',
    requested_amount:  20000,
    term_months:       60,
    purpose:           'Home renovation — kitchen and bathroom upgrade',
    annual_income:     85000,
    employment_status: 'employed',
    credit_score:      720,
    calculated_rate:   0.0749,
    dti_ratio:         0.31,
    status:            'approved',
    created_at:        new Date('2024-01-15'),
    reviewed_at:       new Date('2024-01-16'),
  });

  await knex('nexus_loans').insert({
    id:                  loanId,
    user_id:             alexId,
    application_id:      loanAppId,
    loan_type:           'personal',
    principal_amount:    20000,
    outstanding_balance: 18234.50,
    interest_rate:       0.0749,
    term_months:         60,
    monthly_payment:     401.33,
    status:              'active',
    missed_payments:     0,
    next_payment_date:   new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    created_at:          new Date('2024-01-20'),
  });

  console.log('✓ Created sample loan for Alex');
  console.log('\n Demo seed complete!');
  console.log('   Login: alex.johnson@demo.nexusfinance.io / password123');
  console.log('   Login: admin@nexusfinance.io / password123');
};
