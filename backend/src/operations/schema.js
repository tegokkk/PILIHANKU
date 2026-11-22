import { readdir } from 'node:fs/promises';
export async function checkDatabaseSchema(db) {
  const required = (await readdir(new URL('../database/migrations/', import.meta.url))).filter(
    (name) => name.endsWith('.js')
  );
  const exists = await db.schema.hasTable('knex_migrations');
  const applied = exists ? await db('knex_migrations').pluck('name') : [];
  if (required.some((name) => !applied.includes(name))) {
    const error = new Error(
      'Database migration required. Run npm run migrate before starting the server.'
    );
    error.code = 'MIGRATION_REQUIRED';
    throw error;
  }
}
