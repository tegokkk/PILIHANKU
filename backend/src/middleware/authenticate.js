import { fail } from '../utils/api-error.js';
export function identity(db) {
  return async (req, res, next) => {
    if (req.session.userId) {
      const user = await db('users').where({ id: req.session.userId }).first();
      if (
        !user ||
        user.status !== 'approved' ||
        user.session_version !== req.session.version ||
        !Number.isFinite(req.session.born) ||
        !Number.isFinite(req.session.lastSeen) ||
        Date.now() - req.session.born > 8 * 3600000 ||
        Date.now() - (req.session.lastSeen || 0) > 30 * 60000
      ) {
        await new Promise((resolve, reject) =>
          req.session.regenerate((e) => (e ? reject(e) : resolve()))
        );
      } else {
        req.user = user;
        // Passive checks must not keep an idle session alive.
        if (!['/auth/me', '/auth/csrf'].includes(req.path)) req.session.lastSeen = Date.now();
        res.set(
          'X-Session-Expires-At',
          String(Math.min(req.session.born + 8 * 3600000, req.session.lastSeen + 30 * 60000))
        );
      }
    }
    next();
  };
}
export const requireAuth = (req, res, next) => {
  fail(req.user, 401, 'SESSION_REQUIRED', 'Sesi berakhir atau belum masuk. Silakan masuk kembali.');
  fail(
    !req.user.must_change_password,
    403,
    'PASSWORD_CHANGE_REQUIRED',
    'Ganti password awal melalui Pengaturan Data.'
  );
  next();
};
export const allow =
  (...roles) =>
  (req, res, next) => {
    requireAuth(req, res, () => {
      fail(roles.includes(req.user.role), 403, 'FORBIDDEN', 'Akses tidak diizinkan.');
      next();
    });
  };
export async function studentClass(db, user) {
  const profile = await db('student_profiles as p')
    .join('classes as c', 'c.id', 'p.class_id')
    .where('p.user_id', user.id)
    .where('p.school_id', user.school_id)
    .select('c.*')
    .first();
  fail(
    profile && profile.active && new Date(profile.retention_end_at) > new Date(),
    403,
    'CLASS_EXPIRED',
    'Kelas tidak aktif atau masa simpan berakhir.'
  );
  return profile;
}
export async function teacherClass(db, user, id) {
  const cls = await db('classes as c')
    .join('teacher_class_assignments as a', 'a.class_id', 'c.id')
    .where({ 'a.teacher_id': user.id, 'c.id': id, 'c.school_id': user.school_id, 'c.active': true })
    .where('c.retention_end_at', '>', new Date())
    .select('c.*')
    .first();
  fail(cls, 404, 'NOT_FOUND', 'Kelas tidak tersedia.');
  return cls;
}
