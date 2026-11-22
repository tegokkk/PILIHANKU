import { exportDeletionLedger } from '../operations/deletion-ledger.js';
import { readEnv } from '../config/env.js';
import { createDatabase } from '../config/database.js';
import { isAbsolute } from 'node:path';
if (!process.argv[2] || !isAbsolute(process.argv[2]))
  throw new Error('Provide absolute output path on storage separate from database backups.');
const db = createDatabase(readEnv().databaseUrl);
try {
  await exportDeletionLedger(db, process.argv[2]);
  console.log('Deletion ledger exported. Protect and retain separately for the backup window.');
} finally {
  await db.destroy();
}
