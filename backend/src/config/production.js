import { access } from 'node:fs/promises';

export async function checkProductionStartup(db, env) {
  if (!env.production) return;
  if (env.bootstrapConfigured)
    throw new Error('Remove bootstrap credentials before starting the production server.');
  if (await db('schools').where({ is_demo: true }).first('id'))
    throw new Error('Production refuses demo school data. Use a separate production database.');
  if (!env.serverless) {
    await access(new URL('../../../frontend/dist/index.html', import.meta.url));
  }
}
