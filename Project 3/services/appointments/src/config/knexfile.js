require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });

/** @type {import('knex').Knex.Config} */
const config = {
  client: 'pg',
  connection: {
    host:     process.env.MEDICORE_DB_HOST     || 'localhost',
    port:     Number(process.env.MEDICORE_DB_PORT) || 5434,
    user:     process.env.MEDICORE_DB_USER     || 'medicore',
    password: process.env.MEDICORE_DB_PASSWORD || 'medicore_dev_password',
    database: process.env.MEDICORE_DB_NAME     || 'medicore_dev',
  },
  pool: { min: 2, max: 10 },
  migrations: {
    directory: require('path').resolve(__dirname, '../../migrations'),
    extension: 'js',
    tableName: 'mc_appointments_migrations',
  },
  seeds: {
    directory: require('path').resolve(__dirname, '../../seeds'),
  },
};

module.exports = config;
