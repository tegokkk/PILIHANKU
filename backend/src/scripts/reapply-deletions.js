// Run after restoring a backup, before reopening application traffic.
// Input is the deletion ledger exported separately from the restored backup.
import { readFile } from 'node:fs/promises';
import { readEnv } from '../config/env.js';
import { createDatabase } from '../config/database.js';
import { reapplyDeletions } from '../jobs/restore-deletions.js';
import { isAbsolute } from 'node:path';
const file = process.argv[2];
if (!file || !isAbsolute(file))
  throw new Error('Provide absolute path to an independently retained deletion-ledger JSON array.');
const ledger = JSON.parse(await readFile(file, 'utf8'));
const db = createDatabase(readEnv().databaseUrl);
try {
  const count = await reapplyDeletions(db, ledger);
  console.log(`Reapplied ${count} deletions before reopening service.`);
} finally {
  await db.destroy();
}
