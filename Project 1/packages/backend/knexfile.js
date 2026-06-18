require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host:     process.env.NEXUS_DB_HOST     || 'localhost',
      port:     Number(process.env.NEXUS_DB_PORT || 5432),
      user:     process.env.NEXUS_DB_USER     || 'nexus_user',
      password: process.env.NEXUS_DB_PASSWORD || 'nexus_dev_password',
      database: process.env.NEXUS_DB_NAME     || 'nexusfinance_dev',
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: './src/migrations',
      tableName: 'nexus_migrations',
      loadExtensions: ['.js'],
    },
    seeds: {
      directory: './src/seeds',
      loadExtensions: ['.js'],
    },
  },

  test: {
    client: 'pg',
    connection: {
      host:     process.env.NEXUS_DB_HOST     || 'localhost',
      port:     Number(process.env.NEXUS_DB_PORT || 5432),
      user:     process.env.NEXUS_DB_USER     || 'nexus_user',
      password: process.env.NEXUS_DB_PASSWORD || 'nexus_dev_password',
      database: 'nexusfinance_test',
    },
    pool: { min: 1, max: 5 },
    migrations: {
      directory: './src/migrations',
      tableName: 'nexus_migrations',
      loadExtensions: ['.js'],
    },
  },

  production: {
    client: 'pg',
    connection: {
      host:     process.env.NEXUS_DB_HOST,
      port:     Number(process.env.NEXUS_DB_PORT || 5432),
      user:     process.env.NEXUS_DB_USER,
      password: process.env.NEXUS_DB_PASSWORD,
      database: process.env.NEXUS_DB_NAME,
      ssl:      { rejectUnauthorized: true },
    },
    pool: { min: 5, max: 50 },
    migrations: {
      directory: './src/migrations',
      tableName: 'nexus_migrations',
      loadExtensions: ['.js'],
    },
  },
};
