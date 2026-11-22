import knex from 'knex';
import { fileURLToPath } from 'node:url';
export const createDatabase = (connection, { max = 10, serverless = false } = {}) =>
  knex({
    client: 'pg',
    connection: {
      connectionString: connection,
      connectionTimeoutMillis: 5000,
      ...(serverless
        ? { query_timeout: 15000 }
        : {
            statement_timeout: 15000,
            idle_in_transaction_session_timeout: 15000,
          }),
    },
    acquireConnectionTimeout: 5000,
    pool: { min: 0, max },
    log: {
      warn: () => console.warn('database_pool_warning'),
      error: () => console.error('database_pool_error'),
    },
    migrations: {
      directory: fileURLToPath(new URL('../database/migrations/', import.meta.url)),
      loadExtensions: ['.js'],
    },
  });
