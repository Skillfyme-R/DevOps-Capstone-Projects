require('dotenv').config({ path: '../../.env' });

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host:     process.env.VV_DB_HOST     || 'localhost',
      port:     process.env.VV_DB_PORT     || 5433,
      user:     process.env.VV_DB_USER     || 'vv_user',
      password: process.env.VV_DB_PASSWORD || 'vv_dev_password',
      database: process.env.VV_DB_NAME     || 'vendorvault_dev',
    },
    migrations: { directory: './src/migrations', tableName: 'vv_migrations' },
    seeds:      { directory: './src/seeds' },
  },
  production: {
    client: 'pg',
    connection: {
      host:     process.env.VV_DB_HOST,
      port:     process.env.VV_DB_PORT,
      user:     process.env.VV_DB_USER,
      password: process.env.VV_DB_PASSWORD,
      database: process.env.VV_DB_NAME,
      ssl:      { rejectUnauthorized: true },
    },
    migrations: { directory: './dist/migrations', tableName: 'vv_migrations' },
    pool: { min: 5, max: 30 },
  },
};
