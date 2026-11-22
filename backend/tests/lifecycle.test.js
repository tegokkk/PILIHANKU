import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import { readEnv } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { startServer } from '../src/operations/lifecycle.js';
import { runRetentionJob } from '../src/operations/retention-worker.js';

const env = readEnv();
test(
  'real isolated PostgreSQL outage/restart, schema preflight, worker lock and in-flight HTTP shutdown',
  { timeout: 120000 },
  async (t) => {
    const phase = (name) => console.log('fault_test_phase', name);
    const socket = createServer();
    socket.listen(0, '127.0.0.1');
    await once(socket, 'listening');
    const port = socket.address().port;
    await new Promise((resolve) => socket.close(resolve));
    const directory = path.resolve('.local', `fault-cluster-${randomUUID()}`);
    const password = randomBytes(24).toString('base64url');
    const cluster = new EmbeddedPostgres({
      databaseDir: directory,
      port,
      user: 'synthetic_fault',
      password,
      persistent: true,
      authMethod: 'scram-sha-256',
      autoRehydrateSymlinks: true,
      initdbFlags: ['--encoding=UTF8', '--locale=C'],
      postgresFlags: ['-h', '127.0.0.1'],
      onLog: () => {},
      onError: () => {},
    });
    const stopCluster = async () => {
      if (process.platform !== 'win32') return cluster.stop();
      // Await PostgreSQL shutdown itself. embedded-postgres uses asynchronous
      // taskkill on Windows, which can race an immediate restart of its files.
      const { pg_ctl } = await import('@embedded-postgres/windows-x64');
      await promisify(execFile)(pg_ctl, ['stop', '-D', directory, '-m', 'fast', '-w', '-t', '15'], {
        windowsHide: true,
        timeout: 20000,
      });
    };
    let running, db;
    try {
      await cluster.initialise();
      phase('initialized');
      await cluster.start();
      phase('cluster-started');
      const admin = cluster.getPgClient();
      await admin.connect();
      await admin.query('CREATE DATABASE pilihanku_fault_test');
      await admin.end();
      const databaseUrl = `postgresql://synthetic_fault:${password}@127.0.0.1:${port}/pilihanku_fault_test`;
      const testEnv = {
        ...env,
        databaseUrl,
        production: false,
        port: 0,
        bindHost: '127.0.0.1',
        demo: false,
        test: true,
        requestLogs: false,
      };
      await assert.rejects(startServer(testEnv), (error) => error.code === 'MIGRATION_REQUIRED');
      db = createDatabase(databaseUrl);
      await db.migrate.latest();
      running = await startServer(testEnv);
      phase('api-started');
      const base = `http://127.0.0.1:${running.server.address().port}`;
      assert.equal((await fetch(base + '/api/health')).status, 200);
      assert.equal((await fetch(base + '/api/auth/me')).status, 200);
      await stopCluster();
      phase('cluster-stopped');
      assert.equal((await fetch(base + '/api/health/live')).status, 200);
      assert.equal((await fetch(base + '/api/health')).status, 503);
      assert.equal((await fetch(base + '/api/auth/me')).status, 503);
      phase('outage-verified');
      await cluster.start();
      phase('cluster-restarted');
      assert.equal((await fetch(base + '/api/health')).status, 200);
      assert.equal((await fetch(base + '/api/auth/me')).status, 200);
      phase('recovery-verified');
      const lock = await db.transaction();
      await lock.raw('SELECT pg_advisory_xact_lock(812462)');
      assert.equal((await runRetentionJob(db)).skipped, true);
      await lock.commit();
      assert.equal((await runRetentionJob(db)).skipped, false);
      phase('worker-verified');
      let started;
      const begun = new Promise((resolve) => {
        started = resolve;
      });
      running.app.get('/synthetic-drain', (_req, res) => {
        started();
        setTimeout(() => res.send('completed'), 120);
      });
      const pending = fetch(base + '/synthetic-drain');
      await begun;
      const stopping = running.stop(5000);
      assert.equal(running.app.locals.draining, true);
      assert.equal(await (await pending).text(), 'completed');
      await stopping;
      phase('shutdown-verified');
      running = null;
      await mkdir('../output/qa/release', { recursive: true });
      await writeFile(
        '../output/qa/release/lifecycle.json',
        JSON.stringify(
          {
            synthetic: true,
            isolatedPostgresProcess: true,
            missingSchemaRejected: true,
            livenessDuringOutage: 200,
            readinessDuringOutage: 503,
            apiDuringOutage: 503,
            readinessAfterRestart: 200,
            apiAfterRestart: 200,
            workerOverlapSkipped: true,
            inflightRequestDrained: true,
          },
          null,
          2
        )
      );
    } finally {
      t.diagnostic('Cleaning isolated fault cluster');
      await running?.stop().catch(() => {});
      await db?.destroy();
      await stopCluster().catch(() => {});
      phase('cluster-cleaned');
      if (directory.startsWith(path.resolve('.local') + path.sep))
        await rm(directory, { recursive: true, force: true });
    }
  }
);
