import { pathToFileURL } from 'node:url';
import { readEnv } from '../config/env.js';
import { createDatabase } from '../config/database.js';
import { deleteUserData, deleteConsultation } from './deletion.js';
export async function retain(db, { now = new Date(), pendingDays = 90 } = {}) {
  const due = await db('users as u')
    .leftJoin('student_profiles as p', 'p.user_id', 'u.id')
    .leftJoin('student_registrations as r', 'r.user_id', 'u.id')
    .join('classes as c', function () {
      this.on('c.id', '=', db.raw('coalesce(p.class_id, r.requested_class_id)'));
    })
    .where('u.role', 'siswa')
    .where((q) =>
      q
        .where('c.retention_end_at', '<=', now)
        .orWhere((w) =>
          w
            .whereIn('u.status', ['pending', 'rejected'])
            .where('u.created_at', '<=', new Date(now.getTime() - pendingDays * 86400000))
        )
    )
    .distinct('u.id');
  for (const u of due) await deleteUserData(db, u.id, 'retention');
  // Copies retain the original class deadline even after the sender moves class.
  const expiredRequests = await db('consultations')
    .whereIn('class_id', db('classes').where('retention_end_at', '<=', now).select('id'))
    .select('id');
  for (const row of expiredRequests) await deleteConsultation(db, row.id, 'retention');
  await db('sessions').where('expire', '<=', now).del();
  await db('rate_limit_buckets').where('reset_at', '<=', now).del();
  await db('audit_events')
    .where('created_at', '<', new Date(now.getTime() - 90 * 86400000))
    .del();
  await db('job_runs').insert({
    job: 'retention',
    deleted_count: due.length + expiredRequests.length,
  });
  return { deleted: due.length + expiredRequests.length };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = readEnv(),
    db = createDatabase(env.databaseUrl);
  try {
    console.log(await retain(db, { pendingDays: env.pendingDays }));
  } catch (e) {
    console.error('retention_failed', {
      code: /^[A-Z0-9_]{1,40}$/i.test(e.code || '') ? e.code : 'INTERNAL',
    });
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}
