// Synthetic local measurement, isolated from the development/production database.
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import request from 'supertest';
import { once } from 'node:events';
import { readEnv } from '../config/env.js';
import { createDatabase } from '../config/database.js';
import { createApp } from '../app.js';
import { hashPassword } from '../modules/auth/auth.routes.js';
const env = readEnv(),
  url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a separate *_test database; run after regular tests.');
const db = createDatabase(url),
  app = createApp(db, { ...env, databaseUrl: url, test: true, demo: false });
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const queryStarts = new Map(),
  queryTimes = [];
db.on('query', (query) => queryStarts.set(query.__knexQueryUid, performance.now()));
db.on('query-response', (_response, query) => {
  const start = queryStarts.get(query.__knexQueryUid);
  if (start !== undefined) queryTimes.push(performance.now() - start);
  queryStarts.delete(query.__knexQueryUid);
});
try {
  await db.migrate.latest();
  await db.raw(
    'TRUNCATE schools,sessions,audit_events,deletion_ledger,job_runs RESTART IDENTITY CASCADE'
  );
  const school = randomUUID();
  await db('schools').insert({ id: school, name: 'Synthetic load' });
  const hash = await hashPassword('Load-test-synthetic-password-123!');
  const users = Array.from({ length: 50 }, (_, i) => ({
    id: randomUUID(),
    school_id: school,
    username_normalized: `load.${i}`,
    display_name: 'Synthetic',
    password_hash: hash,
    role: 'siswa',
    status: 'approved',
  }));
  await db('users').insert(users);
  const cards = Array.from({ length: 1000 }, (_, i) => ({
    id: randomUUID(),
    school_id: school,
    title: `Synthetic ${i}`,
    category: ['Kuliah', 'Vokasi & Kedinasan', 'Kerja & Pelatihan', 'Wirausaha'][i % 4],
    status: 'published',
    data: JSON.stringify({
      summary: 'Synthetic load fixture, not reviewed content.',
      interests: ['I'],
      sources: ['https://example.test/synthetic'],
    }),
  }));
  for (let i = 0; i < cards.length; i += 100) await db('cards').insert(cards.slice(i, i + 100));
  const agents = [];
  for (const user of users) {
    const a = request.agent(baseUrl);
    const token = (await a.get('/api/auth/csrf')).body.data.token;
    const result = await a
      .post('/api/auth/login')
      .set('Origin', env.origin)
      .set('X-CSRF-Token', token)
      .send({ username: user.username_normalized, password: 'Load-test-synthetic-password-123!' });
    if (result.status !== 200) throw new Error('Load fixture login failed');
    agents.push(a);
  }
  const rounds = [];
  queryTimes.length = 0;
  for (let round = 0; round < 3; round++) {
    const samples = await Promise.all(
      agents.map(async (a) => {
        const start = performance.now();
        const r = await a.get('/api/cards');
        if (r.status !== 200 || r.body.data.items.length !== 24 || r.body.data.total !== 1000)
          throw new Error('Load response incorrect');
        return performance.now() - start;
      })
    );
    samples.sort((a, b) => a - b);
    rounds.push({
      round: round + 1,
      successfulRequests: samples.length,
      p50Ms: Math.round(samples[24]),
      p95Ms: Math.round(samples[47]),
      maxMs: Math.round(samples[49]),
    });
  }
  queryTimes.sort((a, b) => a - b);
  const report = {
    synthetic: true,
    environment: 'Local Windows, real PostgreSQL, Supertest; no network or Android emulation',
    sessions: 50,
    cards: 1000,
    successfulRequests: rounds.reduce((n, r) => n + r.successfulRequests, 0),
    cardsPerPage: 24,
    rounds,
    database: {
      queries: queryTimes.length,
      p95QueryMs: Math.round(queryTimes[Math.ceil(queryTimes.length * 0.95) - 1]),
    },
    p95Ms: Math.max(...rounds.map((r) => r.p95Ms)),
    targetP95Ms: 2000,
  };
  await mkdir('../output/qa', { recursive: true });
  await writeFile('../output/qa/pilot-load.json', JSON.stringify(report, null, 2));
  console.log(report);
  if (report.p95Ms >= report.targetP95Ms) process.exitCode = 1;
} finally {
  await new Promise((resolve) => server.close(resolve));
  await app.locals.sessionStore.close();
  await db.destroy();
}
