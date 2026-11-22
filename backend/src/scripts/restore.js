import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { restoreDatabase } from '../operations/backup.js';
try {
  const ledger = JSON.parse(await readFile(process.argv[3], 'utf8'));
  console.log(
    await restoreDatabase({
      targetUrl: process.env.RESTORE_DATABASE_URL,
      key: process.env.BACKUP_KEY,
      backupPath: process.argv[2],
      ledger,
      pgBin: process.env.PG_BIN,
      confirmDatabase: process.argv[4],
      pendingDays: Number(process.env.PENDING_RETENTION_DAYS || 90),
    })
  );
} catch {
  console.error(
    'restore_failed: keep target isolated; verify empty target, key, archive and current independent ledger.'
  );
  process.exitCode = 1;
}
