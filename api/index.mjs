import { createApp } from '../backend/src/app.js';
import { createDatabase } from '../backend/src/config/database.js';
import { readEnv } from '../backend/src/config/env.js';
import { checkProductionStartup } from '../backend/src/config/production.js';
import { checkDatabaseSchema } from '../backend/src/operations/schema.js';

let appPromise;

async function initApp() {
  const env = { ...readEnv(process.env), serverless: true };
  const db = createDatabase(env.databaseUrl, { max: 3, serverless: true });
  try {
    await checkDatabaseSchema(db);
    await checkProductionStartup(db, env);
  } catch (err) {
    await db.destroy().catch(() => {});
    throw err;
  }
  return createApp(db, env);
}

export default async function handler(req, res) {
  try {
    if (!appPromise) {
      appPromise = initApp().catch((err) => {
        appPromise = null;
        throw err;
      });
    }
    const app = await appPromise;
    return app(req, res);
  } catch (err) {
    console.error(
      JSON.stringify({
        event: 'vercel_startup_failed',
        code:
          err?.code === 'MIGRATION_REQUIRED' ? 'MIGRATION_REQUIRED' : err?.code || 'STARTUP_FAILED',
        reason: String(err?.message || 'unknown').slice(0, 200),
      })
    );
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({
      error: {
        code: err?.code === 'MIGRATION_REQUIRED' ? 'MIGRATION_REQUIRED' : 'SERVICE_UNAVAILABLE',
        message: 'Layanan belum siap. Periksa konfigurasi environment dan migrasi database.',
      },
    });
  }
}
