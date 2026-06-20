import { Knex } from 'knex';
import { loadConfig } from './loader';

export async function getKnexConfig(): Promise<Knex.Config> {
  const config = await loadConfig();
  const db     = config.backend?.database;

  return {
    client: db?.client ?? 'pg',
    connection: {
      host:     db?.connection?.host     ?? 'localhost',
      port:     Number(db?.connection?.port ?? 5433),
      user:     db?.connection?.user     ?? 'vv_user',
      password: db?.connection?.password ?? '',
      database: db?.connection?.database ?? 'vendorvault_dev',
      ssl:      db?.connection?.ssl,
    },
    pool: {
      min: db?.pool?.min ?? 2,
      max: db?.pool?.max ?? 20,
    },
    migrations: { directory: './src/migrations', tableName: 'vv_migrations' },
    seeds:      { directory: './src/seeds' },
  };
}
