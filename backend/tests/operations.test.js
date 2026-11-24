import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { readEnv } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/modules/auth/auth.routes.js';
import { dateOnly } from '../src/middleware/validate.js';
import { deleteConsultation, subjectHash } from '../src/jobs/deletion.js';
import { PostgresRateLimitStore } from '../src/middleware/rate-limit-store.js';
import { reapplyDeletions } from '../src/jobs/restore-deletions.js';
import { checkProductionStartup } from '../src/config/production.js';
const env = readEnv(),
  url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a separate *_test database.');
test('valid calendar dates, session idle expiry, Unicode CSRF rejected safely, real auth rate limit', async () => {
  assert.equal(dateOnly.safeParse('2026-02-31').success, false);
  assert.equal(dateOnly.safeParse('2028-02-29').success, true);
  const db = createDatabase(url);
  await db.migrate.latest();
  const app = createApp(db, { ...env, databaseUrl: url, test: true });
  try {
    await db.raw(
      'TRUNCATE schools,sessions,audit_events,deletion_ledger,job_runs RESTART IDENTITY CASCADE'
    );
    const school = randomUUID(),
      id = randomUUID();
    await db('schools').insert({ id: school, name: 'Synthetic operations' });
    await db('users').insert({
      id,
      school_id: school,
      username_normalized: 'operations.student',
      display_name: 'Synthetic',
      password_hash: await hashPassword('Test-only-password-123!'),
      role: 'siswa',
      status: 'approved',
    });
    const a = request.agent(app);
    const csrf = (await a.get('/api/auth/csrf')).body.data.token;
    assert.equal(
      (
        await a
          .post('/api/auth/login')
          .set('Origin', env.origin)
          .set('X-CSRF-Token', 'é'.repeat(64))
          .send({})
      ).status,
      403
    );
    assert.equal(
      (
        await a
          .post('/api/auth/login')
          .set('Origin', env.origin)
          .set('X-CSRF-Token', csrf)
          .send({ username: 'operations.student', password: 'Test-only-password-123!' })
      ).status,
      200
    );
    await db('sessions')
      .whereRaw("sess->>'userId' = ?", [id])
      .update({ sess: db.raw("jsonb_set(sess::jsonb, '{lastSeen}', '0')::json") });
    assert.equal((await a.get('/api/admin/registrations')).status, 401);
    assert.equal((await a.get('/api/auth/csrf')).status, 200);
    const limited = createApp(db, { ...env, databaseUrl: url, test: false });
    try {
      const b = request.agent(limited);
      const token = (await b.get('/api/auth/csrf')).body.data.token;
      let status = 0;
      for (let i = 0; i < 41; i++)
        status = (
          await b
            .post('/api/auth/login')
            .set('Origin', env.origin)
            .set('X-CSRF-Token', token)
            .send({ username: 'nonexistent', password: 'wrong' })
        ).status;
      assert.equal(status, 429);
    } finally {
      await limited.locals.sessionStore.close();
    }
  } finally {
    await app.locals.sessionStore.close();
    await db.destroy();
  }
});
test('deleted consultation enters independently replayable ledger', async () => {
  const db = createDatabase(url);
  try {
    const id = randomUUID();
    await deleteConsultation(db, id, 'self');
    assert.ok(
      await db('deletion_ledger')
        .where({ subject_hash: subjectHash(`consultation:${id}`) })
        .first()
    );
  } finally {
    await db.destroy();
  }
});
test('rate limits share atomic windows across processes and never persist raw identifiers', async () => {
  const db = createDatabase(url);
  const prefix = randomUUID(),
    key = 'synthetic-ip-and-username';
  const first = new PostgresRateLimitStore(db, prefix, env.sessionSecret);
  const second = new PostgresRateLimitStore(db, prefix, env.sessionSecret);
  first.init({ windowMs: 60000 });
  second.init({ windowMs: 60000 });
  try {
    const increments = await Promise.all(
      Array.from({ length: 20 }, (_, i) => (i % 2 ? first : second).increment(key))
    );
    assert.deepEqual(
      increments.map((r) => r.totalHits).sort((a, b) => a - b),
      Array.from({ length: 20 }, (_, i) => i + 1)
    );
    const row = await db('rate_limit_buckets')
      .where({ key_hash: first.hash(key) })
      .first();
    assert.equal(row.hits, 20);
    assert.equal(JSON.stringify(row).includes(key), false);
    await db('rate_limit_buckets')
      .where({ key_hash: first.hash(key) })
      .update({ reset_at: new Date(0) });
    assert.equal((await second.increment(key)).totalHits, 1);
    await first.resetKey(key);
  } finally {
    await db.destroy();
  }
});
test('all migrations roll back and reproduce an empty schema with current constraints', async () => {
  const db = createDatabase(url);
  try {
    await db.migrate.rollback(undefined, true);
    assert.equal(await db.schema.hasTable('users'), false);
    await db.migrate.latest();
    assert.equal(await db.schema.hasTable('content_reports'), true);
    assert.equal(await db.schema.hasTable('deletion_ledger'), true);
    assert.equal(await db.schema.hasColumn('exploration', 'aggregate_consent_version'), true);
  } finally {
    await db.destroy();
  }
});
test('restore replay preserves absent deletion tombstones and erases a restored subject', async () => {
  const db = createDatabase(url),
    school = randomUUID(),
    id = randomUUID();
  try {
    const ledger = [
      { subject_hash: subjectHash(id), deleted_at: '2026-11-22T00:00:00Z', reason: 'self' },
    ];
    assert.equal(await reapplyDeletions(db, ledger), 0);
    assert.ok(
      await db('deletion_ledger')
        .where({ subject_hash: subjectHash(id) })
        .first()
    );
    await db('schools').insert({ id: school, name: 'Synthetic restored school' });
    await db('users').insert({
      id,
      school_id: school,
      username_normalized: 'restored.synthetic',
      display_name: 'Synthetic',
      password_hash: await hashPassword('Synthetic-restored-only-123!'),
      role: 'siswa',
      status: 'approved',
    });
    assert.equal(await reapplyDeletions(db, ledger), 1);
    assert.equal(await db('users').where({ id }).first(), undefined);
    assert.equal(await reapplyDeletions(db, ledger), 0);
    await assert.rejects(reapplyDeletions(db, [{ ...ledger[0], deleted_at: 'invalid' }]));
  } finally {
    await db.destroy();
  }
});

test('environment typos fail closed before insecure development defaults can start', () => {
  const valid = { DATABASE_URL: url, SESSION_SECRET: 'synthetic-environment-only-secret-12345' };
  assert.throws(() => readEnv({ ...valid, NODE_ENV: 'prod' }), /NODE_ENV/);
  assert.throws(
    () => readEnv({ ...valid, REGISTRATION_CLASS_ID: 'invalid' }),
    /REGISTRATION_CLASS_ID/
  );
  assert.throws(
    () => readEnv({ ...valid, NODE_ENV: 'production', APP_ORIGIN: 'http://localhost' }),
    /HTTPS/
  );
  assert.throws(
    () => readEnv({ ...valid, NODE_ENV: 'production', DEMO_CONTENT: 'true' }),
    /DEMO_CONTENT/
  );
});

test('production startup refuses demo data and bootstrap credentials without modifying either', async () => {
  const db = createDatabase(url),
    id = randomUUID();
  try {
    await assert.rejects(
      checkProductionStartup(db, { production: true, bootstrapConfigured: true }),
      /bootstrap/
    );
    await db('schools').insert({ id, name: 'Synthetic demo guard', is_demo: true });
    await assert.rejects(
      checkProductionStartup(db, { production: true, bootstrapConfigured: false }),
      /demo school/
    );
    assert.ok(await db('schools').where({ id }).first());
    await db('schools').where({ id }).del();
    await checkProductionStartup(db, { production: true, bootstrapConfigured: false });
  } finally {
    await db.destroy();
  }
});

test('production sends secure cookies and exhausted auth-IP limits still allow passive checks and logout', async () => {
  const db = createDatabase(url);
  const production = createApp(db, {
    ...env,
    databaseUrl: url,
    production: true,
    trustProxy: 1,
    origin: 'https://audit.test',
    test: false,
  });
  try {
    const r = await request(production).get('/api/auth/csrf').set('X-Forwarded-Proto', 'https');
    assert.equal(r.status, 200);
    const cookie = r.headers['set-cookie'].join(';');
    assert.match(cookie, /Secure/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(r.headers['cache-control'], /no-store/);
    const store = new PostgresRateLimitStore(db, 'auth-ip', env.sessionSecret);
    for (const ip of ['127.0.0.1', '::ffff:127.0.0.1', '::/56'])
      await db('rate_limit_buckets')
        .insert({ key_hash: store.hash(ip), hits: 400, reset_at: new Date(Date.now() + 60000) })
        .onConflict('key_hash')
        .merge();
    assert.equal((await request(production).get('/api/auth/me')).status, 200);
    assert.equal((await request(production).post('/api/auth/login').send({})).status, 429);
    const logout = await request(production)
      .post('/api/auth/logout')
      .set('X-Forwarded-Proto', 'https')
      .set('Cookie', r.headers['set-cookie'].map((c) => c.split(';')[0]).join(';'))
      .set('Origin', 'https://audit.test')
      .set('X-CSRF-Token', r.body.data.token)
      .send({});
    assert.equal(logout.status, 200);
  } finally {
    await production.locals.sessionStore.close();
    await db.destroy();
  }
});
