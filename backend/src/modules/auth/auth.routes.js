import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { z, text, username, password, parse } from '../../middleware/validate.js';
import { fail } from '../../utils/api-error.js';
import { newCsrf } from '../../middleware/csrf.js';
import { audit } from '../audit/audit.js';
export const hashPassword = (p) =>
  argon2.hash(p, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
export const publicUser = (u) => ({
  id: u.id,
  username: u.username_normalized,
  displayName: u.display_name,
  role: u.role,
  mustChangePassword: u.must_change_password,
});
const credentials = z.object({ username, password: z.string().max(128) }).strict();
const regenerate = (req) =>
  new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
async function verify(db, input) {
  const user = await db('users').where({ username_normalized: input.username }).first();
  fail(
    user && (await argon2.verify(user.password_hash, input.password)),
    401,
    'INVALID_CREDENTIALS',
    'Username atau password tidak sesuai.'
  );
  return user;
}
async function registrationClass(db, env) {
  let candidates = await db('classes')
    .where({ active: true })
    .where('retention_end_at', '>', new Date())
    .modify((q) => {
      if (env.registrationClassId) q.where('id', env.registrationClassId);
    })
    .orderBy('id')
    .forShare();
  if (candidates.length === 0 && !env.registrationClassId) {
    const anyClass = await db('classes').first('id');
    if (!anyClass) {
      const schools = await db('schools').select('id').limit(2);
      if (schools.length === 1) {
        const now = new Date();
        const year = now.getUTCFullYear();
        const retentionEnd = new Date(now.getTime() + 365 * 86400000);
        const created = {
          id: randomUUID(),
          school_id: schools[0].id,
          label: 'Umum',
          grade: 'XII',
          academic_year: `${year}/${year + 1}`,
          retention_end_at: retentionEnd,
          active: true,
        };
        await db('classes').insert(created);
        candidates = [created];
      }
    }
  }
  const distinctSchools = new Set(candidates.map((c) => c.school_id));
  fail(
    candidates.length > 0 && distinctSchools.size === 1,
    503,
    'REGISTRATION_UNAVAILABLE',
    'Pendaftaran belum tersedia. Hubungi pengelola untuk mengaktifkan pendaftaran.'
  );
  return candidates[0];
}
export function authRoutes(db, limiter, env) {
  const router = Router();
  router.get('/csrf', (req, res) => {
    req.session.csrf ??= newCsrf();
    res.json({ data: { token: req.session.csrf } });
  });
  router.get('/me', async (req, res) => {
    let cls = null;
    if (req.user?.role === 'siswa')
      cls = await db('student_profiles as p')
        .join('classes as c', 'c.id', 'p.class_id')
        .where('p.user_id', req.user.id)
        .select('c.label', 'c.retention_end_at', 'c.academic_year')
        .first();
    res.json({
      data: req.user
        ? {
            ...publicUser(req.user),
            class: cls,
            expiresAt: Math.min(req.session.born + 8 * 3600000, req.session.lastSeen + 30 * 60000),
          }
        : null,
    });
  });
  router.get('/registration-context', limiter, async (req, res) => {
    const cls = await registrationClass(db, env);
    const school = await db('schools').where({ id: cls.school_id }).first();
    res.json({
      data: {
        pendingRetentionDays: env.pendingDays,
        retentionEnd: cls.retention_end_at,
        timezone: school.timezone,
      },
    });
  });
  router.post('/register', limiter, async (req, res) => {
    const input = parse(
      z
        .object({
          username,
          displayName: text(50).min(1),
          password,
          confirmation: password,
          consent: z.literal(true),
        })
        .strict()
        .refine((i) => i.password === i.confirmation, 'Konfirmasi password tidak sama'),
      req.body
    );
    const passwordHash = await hashPassword(input.password);
    const data = await db.transaction(async (trx) => {
      const cls = await registrationClass(trx, env);
      const id = randomUUID(),
        registrationId = randomUUID();
      await trx('users').insert({
        id,
        school_id: cls.school_id,
        username_normalized: input.username,
        display_name: input.displayName,
        password_hash: passwordHash,
        role: 'siswa',
        status: 'pending',
      });
      await trx('student_registrations').insert({
        id: registrationId,
        user_id: id,
        school_id: cls.school_id,
        requested_class_id: cls.id,
        consent_version: 'registration-1',
      });
      await audit(trx, id, 'registration.created', registrationId);
      return { status: 'pending', message: 'Menunggu persetujuan superadmin' };
    });
    res.status(201).json({ data });
  });
  router.post('/login', limiter, async (req, res) => {
    const user = await verify(db, parse(credentials, req.body));
    fail(
      user.status === 'approved',
      403,
      `ACCOUNT_${user.status.toUpperCase()}`,
      `Status akun: ${user.status}. Periksa status pendaftaran.`
    );
    await regenerate(req);
    req.session.userId = user.id;
    req.session.version = user.session_version;
    req.session.born = Date.now();
    req.session.lastSeen = Date.now();
    req.session.csrf = newCsrf();
    res.json({ data: { user: publicUser(user), csrf: req.session.csrf } });
  });
  router.post('/status', limiter, async (req, res) => {
    const u = await verify(db, parse(credentials, req.body));
    const registration = await db('student_registrations')
      .where({ user_id: u.id })
      .select('status', 'rejection_reason', 'reviewed_at')
      .first();
    res.json({ data: { status: u.status, registration } });
  });
  router.post('/logout', async (req, res) => {
    await new Promise((resolve, reject) => req.session.destroy((e) => (e ? reject(e) : resolve())));
    res.clearCookie('pilihanku.sid', { path: '/' }).json({ data: { loggedOut: true } });
  });
  router.post('/password', limiter, async (req, res) => {
    fail(req.user, 401, 'SESSION_REQUIRED', 'Silakan masuk.');
    const input = parse(
      z
        .object({ current: z.string().max(128), password, confirmation: password })
        .strict()
        .refine((i) => i.password === i.confirmation),
      req.body
    );
    fail(
      await argon2.verify(req.user.password_hash, input.current),
      401,
      'INVALID_CREDENTIALS',
      'Password saat ini tidak sesuai.'
    );
    const newHash = await hashPassword(input.password);
    await db.transaction(async (trx) => {
      const current = await trx('users').where({ id: req.user.id }).forUpdate().first();
      fail(
        current && current.status === 'approved' && current.session_version === req.session.version,
        401,
        'SESSION_REQUIRED',
        'Sesi telah berubah. Silakan masuk kembali.'
      );
      await trx('users')
        .where({ id: req.user.id })
        .update({
          password_hash: newHash,
          must_change_password: false,
          session_version: trx.raw('session_version + 1'),
        });
      await audit(trx, req.user.id, 'password.changed', req.user.id);
    });
    await new Promise((resolve, reject) => req.session.destroy((e) => (e ? reject(e) : resolve())));
    res.clearCookie('pilihanku.sid', { path: '/' }).json({ data: { changed: true } });
  });
  return router;
}
