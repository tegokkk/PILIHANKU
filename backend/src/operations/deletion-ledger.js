import { randomUUID } from 'node:crypto';
import { open, rename, unlink } from 'node:fs/promises';
import { isAbsolute } from 'node:path';

export async function exportDeletionLedger(db, file) {
  if (!isAbsolute(file || '')) throw new Error('Absolute independent ledger path required.');
  const rows = await db('deletion_ledger').select('subject_hash', 'deleted_at', 'reason');
  const temporary = `${file}.${randomUUID()}.partial`;
  try {
    const handle = await open(temporary, 'wx', 0o600);
    try {
      await handle.writeFile(JSON.stringify(rows));
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, file);
    return rows.length;
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
