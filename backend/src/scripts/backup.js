import 'dotenv/config';
import { backupDatabase } from '../operations/backup.js';
try {
  console.log(
    await backupDatabase({
      databaseUrl: process.env.DATABASE_URL,
      key: process.env.BACKUP_KEY,
      outputPath: process.argv[2],
      ledgerPath: process.argv[3],
      pgBin: process.env.PG_BIN,
    })
  );
} catch {
  console.error(
    'backup_failed: verify configuration, PostgreSQL tools and protected output paths.'
  );
  process.exitCode = 1;
}
