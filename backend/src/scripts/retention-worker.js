import { setTimeout } from 'node:timers/promises';
import { readEnv } from '../config/env.js';
import { createDatabase } from '../config/database.js';
import { checkDatabaseSchema } from '../operations/schema.js';
import { runRetentionJob } from '../operations/retention-worker.js';
import { exportDeletionLedger } from '../operations/deletion-ledger.js';
import { isAbsolute } from 'node:path';
const env = readEnv(),
  db = createDatabase(env.databaseUrl),
  abort = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => abort.abort());
try {
  const ledgerPath = process.env.DELETION_LEDGER_PATH;
  if ((env.production || ledgerPath) && !isAbsolute(ledgerPath || ''))
    throw new Error('Independent deletion ledger path required.');
  await checkDatabaseSchema(db);
  let nextRetention = 0;
  while (!abort.signal.aborted) {
    try {
      if (Date.now() >= nextRetention) {
        console.log(
          JSON.stringify({
            event: 'retention_completed',
            ...(await runRetentionJob(db, { pendingDays: env.pendingDays })),
          })
        );
        nextRetention = Date.now() + 3600000;
      }
      if (ledgerPath) await exportDeletionLedger(db, ledgerPath);
    } catch {
      console.error(JSON.stringify({ event: 'retention_worker_cycle_failed' }));
    }
    try {
      await setTimeout(60000, null, { signal: abort.signal });
    } catch {
      /* Stop requested. */
    }
  }
} catch {
  console.error('retention_worker_startup_failed');
  process.exitCode = 1;
} finally {
  await db.destroy();
}
