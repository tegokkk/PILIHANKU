import { writeFile, mkdir } from 'node:fs/promises';
import { readEnv } from '../config/env.js';
import { createDatabase } from '../config/database.js';
import { riasec, matrix } from '../modules/exploration/calculations.js';
const env = readEnv();
if (!env.demo) throw new Error('Only synthetic local demo evidence.');
const db = createDatabase(env.databaseUrl);
try {
  const u = await db('users').where({ username_normalized: 'qa.siswa.browser' }).first();
  const r = await db('student_registrations').where({ user_id: u.id }).first(),
    p = await db('student_profiles').where({ user_id: u.id }).first(),
    e = await db('exploration').where({ user_id: u.id }).first(),
    consultations = await db('consultations').where({ sender_id: u.id });
  const report = {
    synthetic: true,
    checkedAt: new Date().toISOString(),
    accountStatus: u.status,
    registrationStatus: r.status,
    reviewedAt: r.reviewed_at,
    classMembership: !!p,
    oneMembership:
      Number((await db('student_profiles').where({ user_id: u.id }).count().first()).count) === 1,
    approvalAuditCount: Number(
      (
        await db('audit_events')
          .where({ target_id: r.id, action: 'registration.approved' })
          .count()
          .first()
      ).count
    ),
    revision: e?.revision,
    reflection: e && riasec(e.data.answers),
    matrix: e && matrix(e.data.comparison),
    taskCount: e?.data.plan.tasks.length,
    consultations: consultations.map((c) => ({
      status: c.status,
      sharedSections: Object.keys(c.shares),
      schedule: c.schedule,
    })),
    sessionStore: 'PostgreSQL',
  };
  await mkdir('../output/qa', { recursive: true });
  await writeFile('../output/qa/database-evidence.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await db.destroy();
}
