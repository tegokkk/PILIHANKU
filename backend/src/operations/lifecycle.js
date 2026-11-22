import { once } from 'node:events';
import { createApp } from '../app.js';
import { createDatabase } from '../config/database.js';
import { checkProductionStartup } from '../config/production.js';
import { checkDatabaseSchema } from './schema.js';

export async function startServer(env) {
  const db = createDatabase(env.databaseUrl);
  try {
    await checkDatabaseSchema(db);
    await checkProductionStartup(db, env);
  } catch (e) {
    await db.destroy();
    throw e;
  }
  const app = createApp(db, env),
    server = app.listen(env.port, env.bindHost);
  try {
    await once(server, 'listening');
  } catch (e) {
    await app.locals.sessionStore.close();
    await db.destroy();
    throw e;
  }
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  server.setTimeout(20000, (socket) => socket.destroy());
  let closing;
  function stop(timeoutMs = 10000) {
    if (closing) return closing;
    app.locals.draining = true;
    closing = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        server.closeAllConnections();
        reject(new Error('SHUTDOWN_TIMEOUT'));
      }, timeoutMs);
      server.close(async () => {
        try {
          await app.locals.sessionStore.close();
          await db.destroy();
          clearTimeout(timer);
          resolve();
        } catch (e) {
          clearTimeout(timer);
          reject(e);
        }
      });
    });
    return closing;
  }
  return { app, server, db, stop };
}
