import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import request from 'supertest';
import { readEnv } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/modules/auth/auth.routes.js';
import { codeHash } from '../src/modules/classes/classes.routes.js';
import { questions, instrumentVersion, scenarios } from '../src/modules/content/materials.js';
import { emptyExploration, riasec, matrix } from '../src/modules/exploration/calculations.js';
import { protectAggregate } from '../src/modules/reports/reports.routes.js';
import { retain } from '../src/jobs/retention.js';
const base = readEnv();
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error('TEST_DATABASE_URL must point to a separate *_test database.');
const db = createDatabase(databaseUrl),
  env = { ...base, databaseUrl, test: true },
  app = createApp(db, env),
  secret = 'Synthetic-test-password-123!';
let passwordHash, school, otherSchool, cls, otherClass, admin, bk, student;
const agent = () => request.agent(app);
const mutate = async (a, method, url, body = {}, headers = {}) => {
  const csrf = await a.get('/api/auth/csrf');
  return a[method](url)
    .set('Origin', env.origin)
    .set('X-CSRF-Token', csrf.body.data.token)
    .set(headers)
    .send(body);
};
const login = (a, name) =>
  mutate(a, 'post', '/api/auth/login', { username: name, password: secret });
async function user(role, schoolId = school, status = 'approved') {
  const id = randomUUID();
  await db('users').insert({
    id,
    school_id: schoolId,
    username_normalized: `${role}.${id.slice(0, 8)}`,
    display_name: `Test ${role}`,
    password_hash: passwordHash,
    role,
    status,
  });
  return await db('users').where({ id }).first();
}
async function makeStudent(classId = cls, schoolId = school) {
  const u = await user('siswa', schoolId);
  await db('student_profiles').insert({
    user_id: u.id,
    school_id: schoolId,
    class_id: classId,
    participant_id: randomUUID(),
  });
  return u;
}
async function register(a, name = `student.${randomUUID().slice(0, 8)}`) {
  return mutate(a, 'post', '/api/auth/register', {
    username: name,
    displayName: 'Siswa sintetis',
    password: secret,
    confirmation: secret,
    classCode: 'class-test-code-123',
    consent: true,
  });
}
before(async () => {
  await db.migrate.latest();
  passwordHash = await hashPassword(secret);
});
beforeEach(async () => {
  await db.raw(
    'TRUNCATE schools,sessions,audit_events,deletion_ledger,job_runs RESTART IDENTITY CASCADE'
  );
  school = randomUUID();
  otherSchool = randomUUID();
  cls = randomUUID();
  otherClass = randomUUID();
  await db('schools').insert([
    {
      id: school,
      name: 'School test',
      service_contact: 'Kontak sintetis',
      service_hours: 'Jam uji',
      service_enabled: true,
    },
    {
      id: otherSchool,
      name: 'Other test',
      service_contact: 'Other synthetic',
      service_hours: 'Jam uji',
      service_enabled: true,
    },
  ]);
  await db('classes').insert([
    {
      id: cls,
      school_id: school,
      label: 'XI A',
      grade: 'XI',
      academic_year: 'test',
      retention_end_at: '2099-01-01',
      join_code_hash: codeHash('class-test-code-123'),
    },
    {
      id: otherClass,
      school_id: otherSchool,
      label: 'XI B',
      grade: 'XI',
      academic_year: 'test',
      retention_end_at: '2099-01-01',
      join_code_hash: codeHash('other-test-code-123'),
    },
  ]);
  admin = await user('superadmin');
  bk = await user('bk');
  await db('teacher_profiles').insert({ user_id: bk.id, school_id: school });
  await db('teacher_class_assignments').insert({
    teacher_id: bk.id,
    class_id: cls,
    school_id: school,
  });
  student = await makeStudent();
});
after(async () => {
  await app.locals.sessionStore.close();
  await db.destroy();
});
test('health and PostgreSQL session store; credentials, logout, normalized uniqueness, injection', async () => {
  assert.equal((await request(app).get('/api/health')).body.data.database, 'connected');
  const a = agent();
  const context = await mutate(a, 'post', '/api/auth/class-context', {
    classCode: 'class-test-code-123',
  });
  assert.equal(context.status, 200);
  assert.ok(context.body.data.retention_end_at);
  assert.equal(JSON.stringify(context.body).includes('join_code_hash'), false);
  assert.equal((await register(a, 'unique.student')).status, 201);
  assert.equal((await register(a, 'UNIQUE.STUDENT')).status, 409);
  const bad = await mutate(a, 'post', '/api/auth/register', {
    username: 'evil',
    displayName: 'Bad',
    password: secret,
    confirmation: secret,
    classCode: 'class-test-code-123',
    consent: true,
    role: 'superadmin',
    status: 'approved',
  });
  assert.equal(bad.status, 422);
  assert.equal(
    (await mutate(a, 'post', '/api/auth/login', { username: 'unknown', password: secret })).status,
    401
  );
  assert.equal((await login(a, admin.username_normalized)).status, 200);
  assert.equal((await a.get('/api/auth/me')).body.data.role, 'superadmin');
  assert.ok(Number((await db('sessions').count().first()).count) > 0);
  assert.equal((await mutate(a, 'post', '/api/auth/logout')).status, 200);
  assert.equal((await a.get('/api/admin/registrations')).status, 401);
});
test('pending -> atomic approval -> login with correct profile; double click is idempotent', async () => {
  const a = agent(),
    s = agent();
  await register(s, 'pending.student');
  assert.equal((await login(s, 'pending.student')).status, 403);
  assert.equal((await s.get('/api/me/exploration')).status, 401);
  await login(a, admin.username_normalized);
  const reg = await db('student_registrations').first();
  const r = await mutate(a, 'post', `/api/admin/registrations/${reg.id}/approve`);
  assert.equal(r.status, 200);
  assert.equal(
    (await mutate(a, 'post', `/api/admin/registrations/${reg.id}/approve`)).body.data.replayed,
    true
  );
  assert.equal((await login(s, 'pending.student')).status, 200);
  assert.equal(
    (await db('student_profiles').where({ user_id: reg.user_id }).first()).class_id,
    cls
  );
  assert.equal(
    Number(
      (await db('audit_events').where({ action: 'registration.approved' }).count().first()).count
    ),
    1
  );
  assert.equal((await db('users').where({ id: reg.user_id }).first()).status, 'approved');
});
test('opposing concurrent decisions conflict, no duplicate memberships or audit', async () => {
  const a = agent(),
    b = agent();
  await login(a, admin.username_normalized);
  await login(b, admin.username_normalized);
  await register(agent());
  const reg = await db('student_registrations').first();
  const results = await Promise.all([
    mutate(a, 'post', `/api/admin/registrations/${reg.id}/approve`),
    mutate(b, 'post', `/api/admin/registrations/${reg.id}/reject`, {
      reason: 'Kelas perlu dikonfirmasi',
    }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    Number(
      (
        await db('audit_events')
          .whereIn('action', ['registration.approved', 'registration.rejected'])
          .count()
          .first()
      ).count
    ),
    1
  );
  const updated = await db('student_registrations').where({ id: reg.id }).first();
  assert.equal(
    Number((await db('student_profiles').where({ user_id: reg.user_id }).count().first()).count),
    updated.status === 'approved' ? 1 : 0
  );
});
test('rejection reason visible only with credentials; suspended rejected pending never active', async () => {
  const a = agent(),
    s = agent();
  await register(s, 'reject.student');
  await login(a, admin.username_normalized);
  const reg = await db('student_registrations').first();
  assert.equal(
    (await mutate(a, 'post', `/api/admin/registrations/${reg.id}/reject`, { reason: '' })).status,
    422
  );
  await mutate(a, 'post', `/api/admin/registrations/${reg.id}/reject`, {
    reason: 'Konfirmasi kelas dahulu',
  });
  const status = await mutate(s, 'post', '/api/auth/status', {
    username: 'reject.student',
    password: secret,
  });
  assert.equal(status.body.data.registration.rejection_reason, 'Konfirmasi kelas dahulu');
  assert.equal((await login(s, 'reject.student')).status, 403);
  assert.equal((await request(app).get(`/api/auth/status?username=reject.student`)).status, 404);
  assert.equal(
    (await mutate(a, 'patch', `/api/admin/users/${reg.user_id}/status`, { status: 'approved' }))
      .status,
    409
  );
  await db('users').where({ id: student.id }).update({ status: 'suspended' });
  assert.equal((await login(agent(), student.username_normalized)).status, 403);
});
test('inactive class and cross-school approval rejected without partial writes', async () => {
  const a = agent();
  await login(a, admin.username_normalized);
  await register(agent());
  const reg = await db('student_registrations').first();
  await db('classes').where({ id: cls }).update({ active: false });
  assert.equal((await mutate(a, 'post', `/api/admin/registrations/${reg.id}/approve`)).status, 409);
  assert.equal((await db('users').where({ id: reg.user_id }).first()).status, 'pending');
  const alien = await user('superadmin', otherSchool),
    b = agent();
  await login(b, alien.username_normalized);
  assert.equal((await mutate(b, 'post', `/api/admin/registrations/${reg.id}/approve`)).status, 404);
});
test('role boundaries, schools, class scoping, no admin private reflection access', async () => {
  const a = agent(),
    b = agent(),
    s = agent();
  await login(a, admin.username_normalized);
  await login(b, bk.username_normalized);
  await login(s, student.username_normalized);
  for (const actor of [b, s])
    assert.equal((await actor.get('/api/admin/registrations')).status, 403);
  assert.equal((await a.get('/api/me/exploration')).status, 403);
  assert.equal((await a.get('/api/teacher/consultations')).status, 403);
  assert.equal((await s.get('/api/teacher/classes/' + cls + '/summary')).status, 403);
  assert.equal((await b.get('/api/teacher/classes/' + otherClass + '/summary')).status, 404);
  assert.equal(
    (await mutate(b, 'post', `/api/classes/${otherClass}/code`, { action: 'rotate' })).status,
    404
  );
  const list = await b.get('/api/classes');
  assert.deepEqual(
    list.body.data.items.map((c) => c.id),
    [cls]
  );
  assert.equal(JSON.stringify(list.body).includes('join_code_hash'), false);
});
test('CSRF, origin, session regeneration, current status and password revoke old sessions', async () => {
  const a = agent(),
    b = agent();
  const anonymous = await a.get('/api/auth/csrf');
  const logged = await login(a, student.username_normalized);
  assert.notEqual(
    anonymous.headers['set-cookie'][0].split(';')[0],
    logged.headers['set-cookie'][0].split(';')[0]
  );
  assert.equal((await a.put('/api/me/exploration').send({})).status, 403);
  const token = (await a.get('/api/auth/csrf')).body.data.token;
  assert.equal(
    (
      await a
        .put('/api/me/exploration')
        .set('Origin', 'https://evil.invalid')
        .set('X-CSRF-Token', token)
        .send({})
    ).status,
    403
  );
  await login(b, student.username_normalized);
  const changed = await mutate(a, 'post', '/api/auth/password', {
    current: secret,
    password: secret + 'new',
    confirmation: secret + 'new',
  });
  assert.equal(changed.status, 200);
  assert.equal((await b.get('/api/me/exploration')).status, 401);
  const c = agent();
  await mutate(c, 'post', '/api/auth/login', {
    username: student.username_normalized,
    password: secret + 'new',
  });
  await db('users').where({ id: student.id }).update({ status: 'suspended' });
  assert.equal((await c.get('/api/me/exploration')).status, 401);
});
test('BK creation, forced password change, assignments and reset never reveal hash', async () => {
  const a = agent();
  await login(a, admin.username_normalized);
  const r = await mutate(a, 'post', '/api/admin/users/bk', {
    username: 'new.teacher',
    displayName: 'New BK',
    password: secret,
    classIds: [cls],
  });
  assert.equal(r.status, 201);
  const b = agent();
  await login(b, 'new.teacher');
  assert.equal(
    (await b.get('/api/teacher/consultations')).body.error.code,
    'PASSWORD_CHANGE_REQUIRED'
  );
  await mutate(b, 'post', '/api/auth/password', {
    current: secret,
    password: secret + 'new',
    confirmation: secret + 'new',
  });
  await mutate(b, 'post', '/api/auth/login', { username: 'new.teacher', password: secret + 'new' });
  assert.equal((await b.get('/api/teacher/consultations')).status, 200);
  assert.equal(
    JSON.stringify((await a.get('/api/admin/users')).body).includes('password_hash'),
    false
  );
  assert.equal(
    (
      await mutate(a, 'post', `/api/admin/users/${r.body.data.id}/reset`, {
        password: secret,
        verificationNote: 'Identitas diverifikasi sekolah',
      })
    ).status,
    200
  );
  assert.equal((await b.get('/api/teacher/consultations')).status, 401);
});
test('RIASEC complete, equal, ties; matrix manual 26/27, unknown is not zero', () => {
  const answers = Object.fromEntries(questions.map((q) => [q.id, 2]));
  assert.equal(riasec(answers).equal, true);
  assert.deepEqual(Object.values(riasec(answers).scores), [8, 8, 8, 8, 8, 8]);
  delete answers.R1;
  assert.equal(riasec(answers).complete, false);
  answers.R1 = 2;
  for (const q of questions) answers[q.id] = ['R', 'I', 'A'].includes(q.dimension) ? 4 : 1;
  assert.deepEqual(riasec(answers).leading, ['R', 'I', 'A']);
  const c = {
    options: [{ id: 'a' }, { id: 'b' }],
    criteria: [
      { weight: 3, ratings: { a: 4, b: 3 } },
      { weight: 3, ratings: { a: 2, b: 4 } },
      { weight: 2, ratings: { a: 4, b: 3 } },
    ],
  };
  assert.deepEqual(
    matrix(c).totals.map((x) => x.total),
    [26, 27]
  );
  delete c.criteria[0].ratings.a;
  assert.equal(matrix(c).totals, null);
});
test('save reload, validation and revision conflict prevent other student writes', async () => {
  const a = agent(),
    b = agent();
  await login(a, student.username_normalized);
  await login(b, student.username_normalized);
  const input = {
    revision: 0,
    instrumentVersion,
    aggregateConsent: false,
    data: emptyExploration(),
  };
  input.data.answers.R1 = 3;
  assert.equal((await mutate(a, 'put', '/api/me/exploration', input)).status, 200);
  assert.equal((await b.get('/api/me/exploration')).body.data.data.answers.R1, 3);
  assert.equal((await mutate(b, 'put', '/api/me/exploration', input)).status, 409);
  const s2 = await makeStudent(),
    other = agent();
  await login(other, s2.username_normalized);
  assert.equal((await other.get('/api/me/exploration')).body.data.revision, 0);
  assert.equal((await other.get(`/api/me/exploration/${student.id}`)).status, 404);
  input.revision = 1;
  input.data.comparison.criteria[0].weight = 0;
  assert.equal((await mutate(a, 'put', '/api/me/exploration', input)).status, 422);
});
async function consultation(a, overrides = {}, key = randomUUID(), token) {
  return mutate(
    a,
    'post',
    '/api/consultations',
    {
      classId: cls,
      teacherId: bk.id,
      nickname: 'Synthetic',
      topic: 'Minat/jurusan',
      preference: 'Saat jam sekolah',
      message: 'Saya ingin berdiskusi tentang pilihan.',
      sections: [],
      consent: true,
      ...overrides,
    },
    { 'Idempotency-Key': key, ...(token ? { 'X-Guest-Token': token } : {}) }
  );
}
test('consultation snapshots, concurrent idempotency, recipient-only access, withdrawals and scheduling', async () => {
  const a = agent(),
    b = agent(),
    t = agent(),
    ad = agent();
  await login(a, student.username_normalized);
  await login(b, student.username_normalized);
  await login(t, bk.username_normalized);
  await login(ad, admin.username_normalized);
  const data = emptyExploration();
  data.plan.support = 'Only plan secret';
  data.discussion.reason = 'Private discussion never sent';
  await mutate(a, 'put', '/api/me/exploration', {
    revision: 0,
    instrumentVersion,
    aggregateConsent: false,
    data,
  });
  const key = randomUUID();
  const requests = await Promise.all([
    consultation(a, { sections: ['plan'] }, key),
    consultation(b, { sections: ['plan'] }, key),
  ]);
  assert.ok(requests.every((r) => r.status === 201));
  const id = requests[0].body.data.id;
  assert.equal(id, requests[1].body.data.id);
  assert.equal(Number((await db('consultations').count().first()).count), 1);
  assert.equal(
    (await consultation(a, { message: 'Different message with same key' }, key)).status,
    409
  );
  const detail = await t.get(`/api/teacher/consultations/${id}`);
  assert.deepEqual(Object.keys(detail.body.data.shares), ['plan']);
  assert.equal(JSON.stringify(detail.body).includes('Private discussion never sent'), false);
  assert.equal((await ad.get(`/api/teacher/consultations/${id}`)).status, 403);
  assert.equal((await agent().get(`/api/consultations/${id}`)).status, 401);
  data.plan.support = 'Changed after snapshot';
  await mutate(a, 'put', '/api/me/exploration', {
    revision: 1,
    instrumentVersion,
    aggregateConsent: false,
    data,
  });
  assert.equal(
    (await t.get(`/api/teacher/consultations/${id}`)).body.data.shares.plan.support,
    'Only plan secret'
  );
  assert.equal(
    (
      await mutate(t, 'patch', `/api/teacher/consultations/${id}`, {
        revision: 1,
        status: 'Selesai',
      })
    ).status,
    409
  );
  await mutate(t, 'patch', `/api/teacher/consultations/${id}`, { revision: 1, status: 'Ditinjau' });
  await mutate(t, 'patch', `/api/teacher/consultations/${id}`, {
    revision: 2,
    status: 'Dijadwalkan',
    schedule: { date: '2026-12-01', time: '10:00', place: 'Ruang BK sintetis' },
  });
  assert.equal(
    (await a.get(`/api/consultations/${id}`)).body.data.schedule.timezone,
    'Asia/Jakarta'
  );
  await mutate(a, 'delete', `/api/consultations/${id}/shares/plan`);
  assert.deepEqual((await t.get(`/api/teacher/consultations/${id}`)).body.data.shares, {});
  await mutate(a, 'post', `/api/consultations/${id}/cancel`);
  assert.equal((await a.get(`/api/consultations/${id}`)).body.data.status, 'Dibatalkan');
});
test('guest tokens and old guest payloads cannot authorize any consultation access', async () => {
  const a = agent(),
    token = randomBytes(32).toString('hex'),
    id = randomUUID();
  assert.equal(
    (await consultation(a, { classCode: 'class-test-code-123' }, randomUUID(), token)).status,
    401
  );
  for (const path of ['/api/consultations', '/api/consultations/' + id])
    assert.equal((await a.get(path).set('X-Guest-Token', token)).status, 401);
  assert.equal(
    (
      await mutate(a, 'post', '/api/consultations/destinations', {
        classCode: 'class-test-code-123',
      })
    ).status,
    401
  );
  await login(a, student.username_normalized);
  assert.equal((await consultation(a, { guestData: emptyExploration() })).status, 422);
  await db('schools').where({ id: school }).update({ service_enabled: false });
  assert.equal((await consultation(a)).status, 409);
});

test('class and teacher cross-access rejected; unassignment removes inbox access', async () => {
  const a = agent(),
    t = agent();
  await login(a, student.username_normalized);
  await login(t, bk.username_normalized);
  assert.equal((await consultation(a, { classId: otherClass })).status, 403);
  const otherTeacher = await user('bk', otherSchool);
  assert.equal((await consultation(a, { teacherId: otherTeacher.id })).status, 422);
  const r = await consultation(a),
    id = r.body.data.id;
  await db('teacher_class_assignments').where({ teacher_id: bk.id }).del();
  assert.equal((await t.get(`/api/teacher/consultations/${id}`)).status, 404);
  assert.equal((await t.get('/api/teacher/consultations')).body.data.items.length, 0);
});
test('aggregation threshold and complements suppressed in API, opt-out takes effect', async () => {
  assert.deepEqual(protectAggregate(0, [0, 0, 0, 0, 0, 0]), {
    suppressed: true,
    message: 'Data belum cukup',
  });
  for (const n of [1, 4]) assert.equal(protectAggregate(n, [n, n, n, 0, 0, 0]).suppressed, true);
  assert.equal(protectAggregate(5, [5, 0, 5, 0, 0, 0]).suppressed, false);
  assert.deepEqual(protectAggregate(10, [10, 0, 10, 0, 0, 0, 5, 5, 0, 0, 0]).topics, {
    'Minat/jurusan': 5,
    'Kerja/pelatihan': 5,
    Biaya: 0,
    'Diskusi keluarga': 0,
    Lainnya: 0,
  });
  assert.equal(protectAggregate(10, [10, 0, 10, 0, 0, 0, 1, 0, 0, 0, 0]).suppressed, true);
  assert.deepEqual(protectAggregate(6, [5, 0, 5, 0, 0, 0]), {
    suppressed: true,
    message: 'Data belum cukup',
  });
  const t = agent();
  await login(t, bk.username_normalized);
  for (let i = 0; i < 5; i++) {
    const u = i === 0 ? student : await makeStudent();
    const data = emptyExploration();
    data.answers.R1 = 3;
    data.explored = ['Kuliah'];
    await db('exploration').insert({
      user_id: u.id,
      instrument_version: instrumentVersion,
      data: JSON.stringify(data),
      aggregate_consent: true,
    });
  }
  let r = await t.get(`/api/teacher/classes/${cls}/summary`);
  assert.equal(r.body.data.contributors, 5);
  await db('exploration').where({ user_id: student.id }).update({ aggregate_consent: false });
  r = await t.get(`/api/teacher/classes/${cls}/summary`);
  assert.deepEqual(r.body.data, { suppressed: true, message: 'Data belum cukup' });
});
test('editorial draft hidden, publish source/date required, versions conflict, archive preserves snapshot', async () => {
  const t = agent();
  await login(t, bk.username_normalized);
  let payload = {
    title: 'Synthetic card',
    category: 'Kuliah',
    status: 'draft',
    revision: 0,
    verifiedAt: null,
    data: {
      summary: 'Synthetic',
      interests: ['I'],
      activities: 'Synthetic',
      subjects: 'Synthetic',
      requirements: 'Synthetic',
      duration: 'Unknown',
      cost: 'Unknown',
      environment: 'Synthetic',
      reflection: 'Synthetic',
      sources: [],
      officialSourceConfirmed: false,
    },
  };
  const created = await mutate(t, 'post', '/api/teacher/cards', payload);
  assert.equal(created.status, 200);
  const id = created.body.data.id;
  assert.equal(
    (await t.get('/api/cards')).body.data.items.some((c) => c.id === id),
    false
  );
  payload = { ...payload, revision: 1, status: 'published' };
  assert.equal((await mutate(t, 'put', `/api/teacher/cards/${id}`, payload)).status, 422);
  payload = {
    ...payload,
    verifiedAt: '2026-11-01',
    data: {
      ...payload.data,
      sources: ['https://example.edu.test/official'],
      officialSourceConfirmed: true,
    },
  };
  assert.equal((await mutate(t, 'put', `/api/teacher/cards/${id}`, payload)).status, 200);
  assert.equal((await mutate(t, 'put', `/api/teacher/cards/${id}`, payload)).status, 409);
  assert.equal(
    (await t.get('/api/cards')).body.data.items.some((c) => c.id === id),
    true
  );
});
test('deletion cascades, stale sessions cannot re-upload, pending access blocked, retention controlled time', async () => {
  const a = agent();
  await login(a, student.username_normalized);
  await mutate(a, 'put', '/api/me/exploration', {
    revision: 0,
    instrumentVersion,
    aggregateConsent: true,
    data: emptyExploration(),
  });
  await consultation(a);
  assert.equal((await mutate(a, 'delete', '/api/me/data')).status, 200);
  for (const table of ['exploration', 'student_profiles', 'consultations'])
    assert.equal(Number((await db(table).count().first()).count), 0);
  assert.equal(
    (
      await mutate(a, 'put', '/api/me/exploration', {
        revision: 0,
        instrumentVersion,
        aggregateConsent: true,
        data: emptyExploration(),
      })
    ).status,
    401
  );
  assert.equal(Number((await db('deletion_ledger').count().first()).count), 1);
  const pending = agent();
  await register(pending, 'delete.pending');
  assert.equal(
    (
      await mutate(pending, 'post', '/api/auth/delete-own-account', {
        username: 'delete.pending',
        password: secret,
      })
    ).status,
    404
  );
  assert.ok(await db('users').where({ username_normalized: 'delete.pending' }).first());
  const u = await makeStudent();
  await db('classes').where({ id: cls }).update({ retention_end_at: '2026-10-01' });
  const s = agent();
  await login(s, u.username_normalized);
  assert.equal((await s.get('/api/me/exploration')).status, 403);
  const result = await retain(db, { now: new Date('2026-11-21T00:00:00Z') });
  assert.ok(result.deleted >= 1);
  assert.equal(await db('users').where({ id: u.id }).first(), undefined);
});
test('database constraints reject cross-school membership and invalid roles; five scenario trees terminate', async () => {
  await assert.rejects(
    db('users').insert({
      id: randomUUID(),
      school_id: school,
      username_normalized: 'invalid-role',
      display_name: 'Test',
      password_hash: passwordHash,
      role: 'guest',
      status: 'approved',
    })
  );
  const u = await user('siswa');
  await assert.rejects(
    db('student_profiles').insert({
      user_id: u.id,
      school_id: school,
      class_id: otherClass,
      participant_id: randomUUID(),
    })
  );
  for (const scenario of scenarios) {
    const seen = new Set();
    function visit(key, path = []) {
      assert.ok(!path.includes(key));
      const n = scenario.nodes[key];
      assert.ok(n);
      seen.add(key);
      if (n.choices) {
        assert.ok(n.choices.length >= 2);
        for (const choice of n.choices) visit(choice.next, [...path, key]);
      } else {
        assert.ok(n.alternative);
        assert.ok(n.reflection);
        assert.ok(path.length >= 2);
      }
    }
    visit(scenario.start);
    assert.equal(seen.size, Object.keys(scenario.nodes).length);
  }
});
test('catalog pagination searches all cards; interests OR then category/text AND; public metadata minimized', async () => {
  const a = agent();
  await login(a, student.username_normalized);
  await db('cards').insert(
    Array.from({ length: 30 }, (_, i) => ({
      id: randomUUID(),
      school_id: school,
      title: `Needle ${String(i).padStart(2, '0')}`,
      category: i % 2 ? 'Kuliah' : 'Wirausaha',
      status: 'published',
      data: JSON.stringify({
        summary: 'Synthetic',
        interests: [i % 2 ? 'I' : 'A'],
        subjects: 'Quantum subject',
        activities: 'Synthetic',
      }),
    }))
  );
  const page = await a.get('/api/cards?q=Needle&page=2&limit=10');
  assert.equal(page.body.data.items.length, 10);
  assert.equal(page.body.data.total, 30);
  assert.equal(page.body.data.items[0].title, 'Needle 10');
  assert.equal(JSON.stringify(page.body).includes('author_id'), false);
  assert.equal(JSON.stringify(page.body).includes('school_id'), false);
  const filtered = await a.get('/api/cards?q=Quantum&category=Kuliah&interests=I,A');
  assert.equal(filtered.body.data.total, 15);
  assert.equal((await a.get('/api/cards?q=NoSuchCard')).body.data.total, 0);
});
test('source reports stay in publisher school; archived cards preserve private option snapshots', async () => {
  const id = randomUUID(),
    a = agent(),
    t = agent();
  await login(a, student.username_normalized);
  await login(t, bk.username_normalized);
  await db('cards').insert({
    id,
    school_id: school,
    title: 'Snapshot source',
    category: 'Kuliah',
    status: 'published',
    version: 1,
    data: JSON.stringify({ summary: 'Frozen original', interests: ['I'], sources: [] }),
  });
  const data = emptyExploration();
  data.comparison.options = [
    {
      id,
      title: 'Snapshot source',
      sourceId: id,
      version: 1,
      category: 'Kuliah',
      snapshot: { summary: 'Frozen original', sources: [], verified_at: null },
      reason: '',
    },
  ];
  await mutate(a, 'put', '/api/me/exploration', {
    revision: 0,
    instrumentVersion,
    aggregateConsent: false,
    data,
  });
  assert.equal((await a.get('/api/me/exploration')).body.data.sourceNotices.length, 0);
  assert.equal(
    (await mutate(a, 'post', `/api/cards/${id}/report-source`, { issue: 'unavailable' })).status,
    201
  );
  const reports = await t.get('/api/teacher/cards/reports');
  assert.equal(reports.body.data.items.length, 1);
  const other = await user('bk', otherSchool),
    alien = agent();
  await login(alien, other.username_normalized);
  assert.equal((await alien.get('/api/teacher/cards/reports')).body.data.items.length, 0);
  assert.equal(
    (
      await mutate(
        alien,
        'post',
        `/api/teacher/cards/reports/${reports.body.data.items[0].id}/resolve`
      )
    ).status,
    404
  );
  assert.equal(
    (await mutate(t, 'post', `/api/teacher/cards/reports/${reports.body.data.items[0].id}/resolve`))
      .status,
    200
  );
  await db('cards').where({ id }).update({ status: 'archived', version: 2 });
  const reloaded = await a.get('/api/me/exploration');
  assert.equal(reloaded.body.data.sourceNotices.length, 1);
  assert.equal(reloaded.body.data.data.comparison.options[0].snapshot.summary, 'Frozen original');
});

test('all feature APIs reject anonymous requests before CSRF, including guest and direct mutations', async () => {
  const a = agent(),
    id = randomUUID();
  for (const [method, path] of [
    ['get', '/api/materials'],
    ['get', '/api/cards'],
    ['get', '/api/me/exploration'],
    ['get', '/api/classes'],
    ['get', '/api/admin/users'],
    ['get', '/api/admin/registrations'],
    ['get', '/api/teacher/consultations'],
    ['get', '/api/teacher/cards'],
    ['get', '/api/teacher/classes/' + id + '/report'],
    ['get', '/api/consultations'],
    ['post', '/api/consultations/destinations'],
    ['post', '/api/consultations'],
    ['put', '/api/me/exploration'],
    ['delete', '/api/me/data'],
    ['post', '/api/cards/' + id + '/report-source'],
    ['patch', '/api/teacher/consultations/' + id],
    ['delete', '/api/consultations/' + id],
  ]) {
    const r = await a[method](path).send({ role: 'superadmin' });
    assert.equal(r.status, 401, method + ' ' + path);
    assert.equal(r.body.error.code, 'SESSION_REQUIRED');
    assert.match(r.headers['cache-control'], /no-store/);
  }
  assert.equal((await a.get('/api/auth/me')).body.data, null);
  assert.equal((await a.get('/api/auth/csrf')).status, 200);
});
test('server roles, approved status, passive checks, expiry and logout remain authoritative', async () => {
  for (const status of ['pending', 'rejected', 'suspended']) {
    const u = await user('siswa', school, status),
      a = agent();
    assert.equal((await login(a, u.username_normalized)).status, 403);
    assert.equal((await a.get('/api/cards')).status, 401);
  }
  const a = agent(),
    t = agent(),
    root = agent();
  await login(a, student.username_normalized);
  await login(t, bk.username_normalized);
  await login(root, admin.username_normalized);
  assert.equal((await a.get('/api/admin/users?role=superadmin')).status, 403);
  assert.equal((await t.get('/api/me/exploration')).status, 403);
  assert.equal((await root.get('/api/consultations')).status, 403);
  assert.equal((await t.get('/api/admin/registrations')).status, 403);
  const sessions = await db('sessions').select('sid', 'sess');
  const row = sessions.find((x) => x.sess.userId === student.id);
  const idle = Date.now() - 29 * 60000;
  await db('sessions')
    .where({ sid: row.sid })
    .update({ sess: { ...row.sess, lastSeen: idle } });
  const me = await a.get('/api/auth/me');
  assert.equal(me.body.data.expiresAt, idle + 30 * 60000);
  assert.equal((await db('sessions').where({ sid: row.sid }).first()).sess.lastSeen, idle);
  await db('sessions')
    .where({ sid: row.sid })
    .update({ sess: { ...row.sess, lastSeen: Date.now() - 31 * 60000 } });
  assert.equal((await a.put('/api/me/exploration').send({})).status, 401);
  assert.equal((await a.get('/api/auth/me')).body.data, null);
  await login(a, student.username_normalized);
  await db('users').where({ id: student.id }).update({ status: 'suspended' });
  assert.equal((await a.get('/api/cards')).status, 401);
  assert.equal((await mutate(t, 'post', '/api/auth/logout')).status, 200);
  assert.equal((await t.get('/api/teacher/consultations')).status, 401);
});

test('production deep links redirect anonymously before serving the application shell', async () => {
  const production = createApp(db, {
    ...env,
    production: true,
    origin: 'https://local.test',
    trustProxy: 1,
  });
  try {
    for (const path of [
      '/kenali-diriku',
      '/peta-jalur?panel=simulasi',
      '/timbang-pilihan',
      '/rencana-langkahku?panel=export',
      '/guru',
      '/guru/kelola',
    ]) {
      const r = await request(production).get(path);
      assert.equal(r.status, 302, path);
      assert.equal(r.headers.location, '/mulai?tab=masuk');
      assert.match(r.headers['cache-control'], /no-store/);
    }
    const homepage = await request(production).get('/');
    assert.equal(homepage.status, 200);
    assert.match(homepage.headers['content-type'], /text\/html/);
    const signin = await request(production).get('/mulai?tab=masuk');
    assert.equal(signin.status, 200);
    assert.match(signin.headers['content-type'], /text\/html/);
  } finally {
    await production.locals.sessionStore.close();
  }
});

test('parser failures never reflect submitted secrets and all API errors bypass caches', async () => {
  const marker = 'synthetic-private-password-marker';
  const malformed = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send(`{"password":"${marker}" INVALID}`);
  assert.equal(malformed.status, 400);
  assert.equal(JSON.stringify(malformed.body).includes(marker), false);
  assert.equal(malformed.body.error.code, 'INVALID_JSON');
  assert.match(malformed.headers['cache-control'], /no-store/);
  const large = await request(app)
    .post('/api/auth/login')
    .send({ password: 'x'.repeat(300000) });
  assert.equal(large.status, 413);
  assert.equal(large.body.error.code, 'BODY_TOO_LARGE');
  assert.match(large.headers['cache-control'], /no-store/);
});

test('retention follows current membership and still expires old consultation copies', async () => {
  const currentClass = randomUUID();
  await db('classes').insert({
    id: currentClass,
    school_id: school,
    label: 'XII Current',
    grade: 'XII',
    academic_year: 'test',
    retention_end_at: '2099-01-01',
  });
  await db('student_registrations').insert({
    id: randomUUID(),
    user_id: student.id,
    school_id: school,
    requested_class_id: cls,
    status: 'approved',
    consent_version: 'test',
  });
  const a = agent();
  await login(a, student.username_normalized);
  const created = await consultation(a);
  assert.equal(created.status, 201);
  await db('student_profiles').where({ user_id: student.id }).update({ class_id: currentClass });
  await db('classes').where({ id: cls }).update({ retention_end_at: '2026-01-01' });
  await retain(db, { now: new Date('2026-11-22T00:00:00Z') });
  assert.ok(await db('users').where({ id: student.id }).first());
  assert.equal(await db('consultations').where({ id: created.body.data.id }).first(), undefined);
});

test('an approved student can erase their own data after class expiry', async () => {
  const a = agent();
  await login(a, student.username_normalized);
  await db('classes').where({ id: cls }).update({ retention_end_at: '2026-01-01' });
  assert.equal((await a.get('/api/me/exploration')).status, 403);
  assert.equal((await mutate(a, 'delete', '/api/me/data')).status, 200);
  assert.equal(await db('users').where({ id: student.id }).first(), undefined);
});

test('duplicate class assignments are rejected before writing a BK account', async () => {
  const a = agent();
  await login(a, admin.username_normalized);
  const r = await mutate(a, 'post', '/api/admin/users/bk', {
    username: 'duplicate.bk',
    displayName: 'Synthetic BK',
    password: secret,
    classIds: [cls, cls],
  });
  assert.equal(r.status, 422);
  assert.equal(await db('users').where({ username_normalized: 'duplicate.bk' }).first(), undefined);
});

test('schedule retries compare the full request and creation retries return current status', async () => {
  const a = agent(),
    t = agent(),
    key = randomUUID();
  await login(a, student.username_normalized);
  await login(t, bk.username_normalized);
  const created = await consultation(a, {}, key),
    id = created.body.data.id;
  await mutate(t, 'patch', `/api/teacher/consultations/${id}`, { revision: 1, status: 'Ditinjau' });
  const schedule = { date: '2026-12-01', time: '10:00', place: 'Ruang sintetis' };
  const payload = { revision: 2, status: 'Dijadwalkan', schedule };
  assert.equal((await mutate(t, 'patch', `/api/teacher/consultations/${id}`, payload)).status, 200);
  assert.equal(
    (await mutate(t, 'patch', `/api/teacher/consultations/${id}`, payload)).body.data.replayed,
    true
  );
  assert.equal(
    (
      await mutate(t, 'patch', `/api/teacher/consultations/${id}`, {
        ...payload,
        schedule: { ...schedule, time: '11:00' },
      })
    ).status,
    409
  );
  assert.equal((await consultation(a, {}, key)).body.data.status, 'Dijadwalkan');
});

test('paginated private lists retain scope, deterministic order and server filters', async () => {
  const a = agent(),
    t = agent(),
    root = agent();
  await login(a, student.username_normalized);
  await login(t, bk.username_normalized);
  await login(root, admin.username_normalized);
  const rows = Array.from({ length: 45 }, (_, i) => ({
    id: randomUUID(),
    sender_id: student.id,
    operation_key: randomUUID(),
    payload_hash: 'synthetic',
    teacher_id: bk.id,
    class_id: cls,
    nickname: 'Synthetic',
    topic: 'Biaya',
    preference: 'Jam uji',
    message: 'Pesan sintetis audit',
    shares: JSON.stringify(i % 2 ? {} : { plan: emptyExploration().plan }),
    consent_version: 'synthetic',
    status: i % 2 ? 'Baru' : 'Ditinjau',
  }));
  await db('consultations').insert(rows);
  const first = await a.get('/api/consultations?page=1'),
    second = await a.get('/api/consultations?page=2');
  assert.equal(first.body.data.total, 45);
  assert.equal(first.body.data.items.length, 20);
  assert.equal(second.body.data.items.length, 20);
  assert.equal(
    first.body.data.items.some((x) => second.body.data.items.some((y) => x.id === y.id)),
    false
  );
  assert.equal((await a.get('/api/consultations?page=-1')).status, 422);
  const filtered = await t.get('/api/teacher/consultations?status=Ditinjau&section=plan&page=2');
  assert.equal(filtered.body.data.total, 23);
  assert.equal(filtered.body.data.items.length, 3);
  assert.equal(JSON.stringify(filtered.body).includes('Pesan sintetis audit'), false);
  assert.ok(filtered.body.data.items.every((x) => x.shared_sections.join() === 'plan'));
  assert.equal((await root.get('/api/admin/users?page=1')).body.data.pageSize, 20);
  assert.equal((await t.get('/api/teacher/cards?page=1')).body.data.pageSize, 20);
});

test('a password change verified before a concurrent reset cannot overwrite the reset', async () => {
  const a = agent();
  await login(a, student.username_normalized);
  const resetHash = await hashPassword('Synthetic-reset-wins-2026!');
  const transaction = await db.transaction();
  let queryListener, timeout;
  try {
    await transaction('users').where({ id: student.id }).forUpdate().first();
    const waiting = new Promise((resolve, reject) => {
      timeout = setTimeout(
        () => reject(Error('Password mutation did not reach locked row')),
        15000
      );
      queryListener = ({ sql }) => {
        if (/users/.test(sql) && (/for update/i.test(sql) || /^update "users"/i.test(sql)))
          resolve();
      };
      db.on('query', queryListener);
    });
    const changing = mutate(a, 'post', '/api/auth/password', {
      current: secret,
      password: 'Synthetic-stale-change-2026!',
      confirmation: 'Synthetic-stale-change-2026!',
    });
    await waiting;
    clearTimeout(timeout);
    db.removeListener('query', queryListener);
    await transaction('users')
      .where({ id: student.id })
      .update({
        password_hash: resetHash,
        session_version: transaction.raw('session_version + 1'),
        must_change_password: true,
      });
    await transaction.commit();
    assert.equal((await changing).status, 401);
    assert.equal((await db('users').where({ id: student.id }).first()).password_hash, resetHash);
  } finally {
    clearTimeout(timeout);
    if (queryListener) db.removeListener('query', queryListener);
    if (!transaction.isCompleted()) await transaction.rollback();
  }
});

test('SQL aggregates count unique consented senders and return no reflection payloads', async () => {
  const t = agent();
  await login(t, bk.username_normalized);
  for (let i = 0; i < 12; i++) {
    const u = i === 0 ? student : await makeStudent();
    const data = emptyExploration();
    data.answers.R1 = 3;
    data.context.support = 'private aggregate marker';
    if (i < 6) {
      data.explored = ['Kuliah'];
      data.plan.tasks = Array.from({ length: 3 }, (_, n) => ({
        id: String(n),
        title: 'Synthetic',
        due: '',
        done: false,
      }));
    }
    await db('exploration').insert({
      user_id: u.id,
      instrument_version: instrumentVersion,
      data: JSON.stringify(data),
      aggregate_consent: true,
    });
    if (i < 6)
      for (let n = 0; n < 2; n++)
        await db('consultations').insert({
          id: randomUUID(),
          sender_id: u.id,
          operation_key: randomUUID(),
          payload_hash: 'synthetic',
          teacher_id: bk.id,
          class_id: cls,
          nickname: 'Synthetic',
          topic: 'Biaya',
          preference: 'Synthetic',
          message: 'Private synthetic request',
          consent_version: 'test',
        });
  }
  const result = await t.get(`/api/teacher/classes/${cls}/summary`);
  assert.equal(result.status, 200);
  assert.equal(result.body.data.suppressed, false);
  assert.equal(result.body.data.contributors, 12);
  assert.equal(result.body.data.plans, 6);
  assert.equal(result.body.data.categories.Kuliah, 6);
  assert.equal(result.body.data.topics.Biaya, 6);
  assert.equal(JSON.stringify(result.body).includes('private aggregate marker'), false);
  assert.equal(JSON.stringify(result.body).includes('Private synthetic request'), false);
  assert.ok(Buffer.byteLength(JSON.stringify(result.body)) < 1000);
});

test('class and source-report pagination retain all data and operations remain admin-only', async () => {
  const root = agent(),
    t = agent(),
    s = agent();
  await login(root, admin.username_normalized);
  await login(t, bk.username_normalized);
  await login(s, student.username_normalized);
  await db('classes').insert(
    Array.from({ length: 25 }, (_, i) => ({
      id: randomUUID(),
      school_id: school,
      label: `Synthetic ${i}`,
      grade: 'XI',
      academic_year: 'test',
      retention_end_at: '2099-01-01',
    }))
  );
  const first = await root.get('/api/classes?page=1'),
    second = await root.get('/api/classes?page=2');
  assert.equal(first.body.data.total, 26);
  assert.equal(first.body.data.items.length, 20);
  assert.equal(second.body.data.items.length, 6);
  assert.equal(
    first.body.data.items.some((x) => second.body.data.items.some((y) => x.id === y.id)),
    false
  );
  assert.equal((await t.get('/api/classes')).body.data.total, 1);
  const card = randomUUID();
  await db('cards').insert({
    id: card,
    school_id: school,
    title: 'Synthetic',
    category: 'Kuliah',
    status: 'published',
    data: '{}',
  });
  await db('content_reports').insert(
    Array.from({ length: 25 }, () => ({ id: randomUUID(), card_id: card, issue: 'outdated' }))
  );
  assert.equal((await t.get('/api/teacher/cards/reports?page=2')).body.data.items.length, 5);
  assert.equal((await t.get('/api/admin/operations')).status, 403);
  assert.equal((await s.get('/api/admin/operations')).status, 403);
  const operations = await root.get('/api/admin/operations');
  assert.equal(operations.status, 200);
  assert.equal(operations.body.data.retention.stale, true);
  assert.equal(JSON.stringify(operations.body).includes('password'), false);
});
