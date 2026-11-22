import { spawn } from 'node:child_process';
import { randomBytes, randomUUID, createCipheriv, createDecipheriv } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { open, appendFile, rename, unlink, stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { createDatabase } from '../config/database.js';
import { reapplyDeletions, parseDeletionLedger } from '../jobs/restore-deletions.js';
import { retain } from '../jobs/retention.js';
import { exportDeletionLedger } from './deletion-ledger.js';

const magic = Buffer.from('PILIHANKU_BACKUP_V1\n');
function backupKey(value) {
  const key = Buffer.from(value || '', 'base64');
  if (key.length !== 32 || key.toString('base64') !== value)
    throw new Error('BACKUP_KEY must contain exactly 32 random bytes encoded as base64.');
  return key;
}
function pgEnvironment(connectionString) {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error('PostgreSQL URL required.');
  const environment = {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGCONNECT_TIMEOUT: '5',
  };
  for (const [parameter, variable] of Object.entries({
    sslmode: 'PGSSLMODE',
    sslrootcert: 'PGSSLROOTCERT',
    sslcert: 'PGSSLCERT',
    sslkey: 'PGSSLKEY',
  }))
    if (url.searchParams.has(parameter)) environment[variable] = url.searchParams.get(parameter);
  return environment;
}
function tool(pgBin, name) {
  return pgBin ? path.join(pgBin, name + (process.platform === 'win32' ? '.exe' : '')) : name;
}
function pgProcess(pgBin, name, args, databaseUrl) {
  const child = spawn(tool(pgBin, name), args, {
    env: pgEnvironment(databaseUrl),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // stderr can contain SQL and row contents: never forward it to application logs.
  child.stderr.resume();
  const done = new Promise((resolve) => {
    child.once('error', () => resolve(-1));
    child.once('exit', (code) => resolve(code ?? -1));
  });
  return { child, done };
}
function separateLedger(outputPath, ledgerPath) {
  if (!path.isAbsolute(outputPath) || !path.isAbsolute(ledgerPath))
    throw new Error('Absolute backup and independent ledger paths required.');
  const relative = path.relative(path.dirname(outputPath), ledgerPath);
  if (!relative.startsWith('..' + path.sep) && !path.isAbsolute(relative))
    throw new Error('Keep the deletion ledger outside the backup directory.');
}
export async function backupDatabase({ databaseUrl, key, outputPath, ledgerPath, pgBin }) {
  const encryptionKey = backupKey(key);
  separateLedger(outputPath, ledgerPath);
  try {
    await stat(outputPath);
    throw new Error('Backup output already exists; choose a new filename.');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const temporary = `${outputPath}.${randomUUID()}.partial`,
    iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  const { child, done } = pgProcess(
    pgBin,
    'pg_dump',
    ['--format=custom', '--no-owner', '--no-acl', '--no-password'],
    databaseUrl
  );
  try {
    const destination = createWriteStream(temporary, { flags: 'wx', mode: 0o600 });
    destination.write(Buffer.concat([magic, iv]));
    await pipeline(child.stdout, cipher, destination);
    if ((await done) !== 0) throw new Error('PG_DUMP_FAILED: backup was not completed.');
    await appendFile(temporary, cipher.getAuthTag());
    const db = createDatabase(databaseUrl);
    try {
      await exportDeletionLedger(db, ledgerPath);
    } finally {
      await db.destroy();
    }
    const handle = await open(temporary, 'r+');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, outputPath);
    return { encrypted: true, bytes: (await stat(outputPath)).size, ledgerExported: true };
  } catch (e) {
    child.kill();
    await done;
    throw e;
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
export async function restoreDatabase({
  targetUrl,
  key,
  backupPath,
  ledger,
  pgBin,
  confirmDatabase,
  pendingDays = 90,
}) {
  // Reject an invalid independent ledger before touching even an empty target.
  ledger = parseDeletionLedger(ledger);
  if (!Number.isInteger(pendingDays) || pendingDays < 1 || pendingDays > 365)
    throw new Error('Invalid pending retention days.');
  const encryptionKey = backupKey(key),
    environment = pgEnvironment(targetUrl);
  if (confirmDatabase !== environment.PGDATABASE)
    throw new Error('Confirm the exact empty target database name.');
  const db = createDatabase(targetUrl);
  const temporary = path.join(path.dirname(backupPath), `.restore-${randomUUID()}.dump`);
  try {
    const existing = await db('information_schema.tables')
      .where({ table_schema: 'public' })
      .count({ count: '*' })
      .first();
    if (Number(existing.count))
      throw new Error('RESTORE_TARGET_NOT_EMPTY: no existing tables may be overwritten.');
    const file = await open(backupPath, 'r');
    let iv, tag, size;
    try {
      size = (await file.stat()).size;
      if (size < magic.length + 12 + 16 + 1) throw new Error('Invalid encrypted backup.');
      const header = Buffer.alloc(magic.length + 12);
      await file.read(header, 0, header.length, 0);
      if (!header.subarray(0, magic.length).equals(magic))
        throw new Error('Invalid backup version.');
      iv = header.subarray(magic.length);
      tag = Buffer.alloc(16);
      await file.read(tag, 0, 16, size - 16);
    } finally {
      await file.close();
    }
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey, iv);
    decipher.setAuthTag(tag);
    // Authentication must succeed before pg_restore is allowed to modify the target.
    await pipeline(
      createReadStream(backupPath, { start: magic.length + 12, end: size - 17 }),
      decipher,
      createWriteStream(temporary, { flags: 'wx', mode: 0o600 })
    );
    const { child, done } = pgProcess(
      pgBin,
      'pg_restore',
      [
        '--no-owner',
        '--no-acl',
        '--exit-on-error',
        '--single-transaction',
        '--no-password',
        '--dbname',
        environment.PGDATABASE,
        temporary,
      ],
      targetUrl
    );
    child.stdout.resume();
    if ((await done) !== 0)
      throw new Error('PG_RESTORE_FAILED: keep target isolated and investigate before retrying.');
    await db.migrate.latest();
    const replayed = await reapplyDeletions(db, ledger);
    const retention = await retain(db, { pendingDays });
    await db('sessions').del(); // Restored cookies must never regain access.
    await db('rate_limit_buckets').del();
    return {
      restored: true,
      replayedDeletions: replayed,
      retentionDeleted: retention.deleted,
      restoredSessionsCleared: true,
      credentialReviewRequired: true,
    };
  } finally {
    await unlink(temporary).catch(() => {});
    await db.destroy();
  }
}
