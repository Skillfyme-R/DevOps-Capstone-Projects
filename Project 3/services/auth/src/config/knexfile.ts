import type { Knex } from 'knex';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env.MEDICORE_DB_HOST || 'localhost',
    port: Number(process.env.MEDICORE_DB_PORT) || 5434,
    user: process.env.MEDICORE_DB_USER || 'medicore',
    password: process.env.MEDICORE_DB_PASSWORD || 'medicore_dev_password',
    database: process.env.MEDICORE_DB_NAME || 'medicore_dev',
  },
  pool: { min: 2, max: 10 },
  migrations: {
    directory: '../migrations',
    extension: 'js',
    tableName: 'mc_auth_migrations',
  },
  seeds: { directory: '../seeds' },
};

export default config;
module.exports = config;
