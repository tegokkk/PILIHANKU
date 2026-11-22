import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import pg from 'pg';
import { readEnv } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { backupDatabase, restoreDatabase } from '../src/operations/backup.js';
import { deleteUserData, deleteConsultation } from '../src/jobs/deletion.js';
import { emptyExploration } from '../src/modules/exploration/calculations.js';
import { instrumentVersion } from '../src/modules/content/materials.js';
import { exportDeletionLedger } from '../src/operations/deletion-ledger.js';

readEnv();
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || !new URL(testUrl).pathname.endsWith('_test'))
  throw new Error('A disposable *_test database is required.');
test(
  'encrypted pg_dump backup restores schema/data, replays current deletions, applies retention and rejects corruption',
  { skip: !process.env.PG_BIN },
  async () => {
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const sourceName = `pilihanku_recovery_src_${suffix}_test`,
      targetName = `pilihanku_recovery_dst_${suffix}_test`;
    const adminUrl = new URL(testUrl);
    adminUrl.pathname = '/postgres';
    const admin = new pg.Client({ connectionString: adminUrl.href });
    await admin.connect();
    const created = [];
    const workspace = path.resolve('.local', `recovery-${suffix}`);
    const backupDirectory = path.join(workspace, 'backups'),
      ledgerDirectory = path.join(workspace, 'independent-ledger');
    await mkdir(backupDirectory, { recursive: true });
    await mkdir(ledgerDirectory, { recursive: true });
    const sourceUrl = new URL(testUrl),
      targetUrl = new URL(testUrl);
    sourceUrl.pathname = '/' + sourceName;
    targetUrl.pathname = '/' + targetName;
    let source, target;
    try {
      for (const name of [sourceName, targetName]) {
        await admin.query(`CREATE DATABASE "${name}"`);
        created.push(name);
      }
      source = createDatabase(sourceUrl.href);
      target = createDatabase(targetUrl.href);
      await source.migrate.latest();
      const school = randomUUID(),
        cls = randomUUID(),
        expiredClass = randomUUID(),
        teacher = randomUUID();
      const keep = randomUUID(),
        deleted = randomUUID(),
        expired = randomUUID(),
        consultation = randomUUID();
      await source('schools').insert({ id: school, name: 'Synthetic recovery school' });
      await source('classes').insert([
        {
          id: cls,
          school_id: school,
          label: 'Current',
          grade: 'XI',
          academic_year: 'test',
          retention_end_at: '2099-01-01',
        },
        {
          id: expiredClass,
          school_id: school,
          label: 'Expired',
          grade: 'XII',
          academic_year: 'test',
          retention_end_at: '2000-01-01',
        },
      ]);
      await source('users').insert(
        [keep, deleted, expired, teacher].map((id, i) => ({
          id,
          school_id: school,
          username_normalized: `recovery.${i}`,
          display_name: 'Synthetic',
          password_hash: 'synthetic-non-login-fixture',
          role: id === teacher ? 'bk' : 'siswa',
          status: 'approved',
        }))
      );
      await source('student_profiles').insert(
        [keep, deleted, expired].map((id) => ({
          user_id: id,
          school_id: school,
          class_id: id === expired ? expiredClass : cls,
          participant_id: randomUUID(),
        }))
      );
      const data = emptyExploration();
      data.plan.support = 'Synthetic recovery private marker';
      await source('exploration').insert({
        user_id: keep,
        instrument_version: instrumentVersion,
        data: JSON.stringify(data),
      });
      await source('consultations').insert({
        id: consultation,
        sender_id: keep,
        operation_key: randomUUID(),
        payload_hash: 'synthetic',
        teacher_id: teacher,
        class_id: cls,
        nickname: 'Synthetic',
        topic: 'Biaya',
        preference: 'Synthetic',
        message: 'Synthetic copy',
        consent_version: 'test',
      });
      await source('sessions').insert({
        sid: 'synthetic-restored-session',
        sess: JSON.stringify({ userId: keep }),
        expire: '2099-01-01',
      });
      const key = randomBytes(32).toString('base64'),
        backupPath = path.join(backupDirectory, 'database.enc'),
        ledgerPath = path.join(ledgerDirectory, 'current.json'),
        pgBin = process.env.PG_BIN;
      const backupStart = performance.now();
      const backup = await backupDatabase({
        databaseUrl: sourceUrl.href,
        key,
        backupPath,
        outputPath: backupPath,
        ledgerPath,
        pgBin,
      });
      const backupMs = Math.round(performance.now() - backupStart);
      assert.equal(backup.encrypted, true);
      const archive = await readFile(backupPath);
      assert.equal(archive.includes(Buffer.from(data.plan.support)), false);
      // New erasures after the snapshot must still apply using the independently current ledger.
      await deleteUserData(source, deleted, 'self');
      await deleteConsultation(source, consultation, 'self');
      await exportDeletionLedger(source, ledgerPath);
      const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
      const options = {
        targetUrl: targetUrl.href,
        key,
        backupPath,
        ledger,
        pgBin,
        confirmDatabase: targetName,
      };
      await assert.rejects(
        restoreDatabase({ ...options, key: randomBytes(32).toString('base64') })
      );
      const tampered = Buffer.from(archive);
      tampered[tampered.length - 1] ^= 1;
      const tamperedPath = path.join(backupDirectory, 'tampered.enc');
      await writeFile(tamperedPath, tampered);
      await assert.rejects(restoreDatabase({ ...options, backupPath: tamperedPath }));
      await assert.rejects(restoreDatabase({ ...options, ledger: [{ invalid: true }] }));
      assert.equal(
        Number(
          (
            await target('information_schema.tables')
              .where({ table_schema: 'public' })
              .count()
              .first()
          ).count
        ),
        0
      );
      const restoreStart = performance.now(),
        restored = await restoreDatabase(options),
        restoreMs = Math.round(performance.now() - restoreStart);
      assert.equal(restored.restored, true);
      assert.equal(restored.replayedDeletions, 2);
      assert.equal(
        (await target('exploration').where({ user_id: keep }).first()).data.plan.support,
        data.plan.support
      );
      assert.equal(await target('users').where({ id: deleted }).first(), undefined);
      assert.equal(await target('users').where({ id: expired }).first(), undefined);
      assert.equal(await target('consultations').where({ id: consultation }).first(), undefined);
      assert.equal(Number((await target('sessions').count().first()).count), 0);
      assert.equal((await target('knex_migrations').select('name')).length, 5);
      await assert.rejects(restoreDatabase(options), /RESTORE_TARGET_NOT_EMPTY/);
      await assert.rejects(
        backupDatabase({
          databaseUrl: sourceUrl.href,
          key,
          outputPath: path.join(backupDirectory, 'other.enc'),
          ledgerPath: path.join(backupDirectory, 'ledger.json'),
          pgBin,
        }),
        /outside/
      );
      await mkdir('../output/qa/release', { recursive: true });
      await writeFile(
        '../output/qa/release/recovery.json',
        JSON.stringify(
          {
            synthetic: true,
            engine: 'PostgreSQL pg_dump/pg_restore 18.7',
            backupMs,
            restoreMs,
            encryptedBytes: backup.bytes,
            restored: true,
            replayedDeletions: 2,
            expiredAccountsRemoved: true,
            restoredSessionsCleared: true,
            wrongKeyRejected: true,
            corruptionRejected: true,
            nonemptyTargetRejected: true,
            productionBackupProviderTested: false,
          },
          null,
          2
        )
      );
    } finally {
      await source?.destroy();
      await target?.destroy();
      for (const name of created) {
        assert.match(
          name,
          /^pilihanku_recovery_(src|dst)_[a-f0-9]{12}_test$/,
          'Unsafe disposable target'
        );
        await admin.query(`DROP DATABASE "${name}"`);
      }
      await admin.end();
      if (workspace.startsWith(path.resolve('.local') + path.sep))
        await rm(workspace, { recursive: true, force: true });
    }
  }
);
