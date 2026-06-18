/**
 * Knex Configuration File
 *
 * Knex is a SQL query builder and migration tool.
 * This file tells Knex:
 *   - How to connect to the database
 *   - Where to find migration files
 *   - Where to find seed files
 *
 * Used by: `yarn db:migrate`, `yarn db:seed`
 */

import type { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config(); // Load .env file into process.env

const config: Record<string, Knex.Config> = {

  development: {
    client: 'pg',
    connection: {
      host:     process.env.NEXUS_DB_HOST     ?? 'localhost',
      port:     Number(process.env.NEXUS_DB_PORT ?? 5432),
      user:     process.env.NEXUS_DB_USER     ?? 'nexus_user',
      password: process.env.NEXUS_DB_PASSWORD ?? 'nexus_dev_password',
      database: process.env.NEXUS_DB_NAME     ?? 'nexusfinance_dev',
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: '../migrations',     // Where migration files live
      tableName:  'nexus_migrations', // Table that tracks which migrations have run
      extension:  'ts',
    },
    seeds: {
      directory: '../seeds',
      extension: 'ts',
    },
  },

  test: {
    client: 'pg',
    connection: {
      host:     process.env.NEXUS_DB_HOST     ?? 'localhost',
      port:     Number(process.env.NEXUS_DB_PORT ?? 5432),
      user:     process.env.NEXUS_DB_USER     ?? 'nexus_user',
      password: process.env.NEXUS_DB_PASSWORD ?? 'nexus_dev_password',
      database: 'nexusfinance_test',            // Separate test database
    },
    pool: { min: 1, max: 5 },
    migrations: {
      directory: '../migrations',
      tableName:  'nexus_migrations',
      extension:  'ts',
    },
  },

  production: {
    client: 'pg',
    connection: {
      host:     process.env.NEXUS_DB_HOST,
      port:     Number(process.env.NEXUS_DB_PORT ?? 5432),
      user:     process.env.NEXUS_DB_USER,
      password: process.env.NEXUS_DB_PASSWORD,
      database: process.env.NEXUS_DB_NAME,
      ssl:      { rejectUnauthorized: true },   // Enforce SSL in production
    },
    pool: {
      min: 5,
      max: 50,               // More connections to handle production traffic
      acquireTimeoutMillis: 30_000,
      idleTimeoutMillis:    600_000,
    },
    migrations: {
      directory: '../migrations',
      tableName:  'nexus_migrations',
      extension:  'ts',
    },
  },

};

export default config;
