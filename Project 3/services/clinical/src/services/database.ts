import knex, { Knex } from 'knex';
import { AppConfig } from '../config/loader';
import { logger } from '../utils/logger';

let db: Knex;

export async function initDatabase(config: AppConfig): Promise<Knex> {
  db = knex({
    client: 'pg',
    connection: {
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    },
    pool: { min: config.database.pool.min, max: config.database.pool.max },
    acquireConnectionTimeout: 10000,
  });

  await db.raw('SELECT 1');
  logger.info('PostgreSQL connected', { database: config.database.name });
  return db;
}

export function getDb(): Knex {
  if (!db) throw new Error('Database not initialised');
  return db;
}
