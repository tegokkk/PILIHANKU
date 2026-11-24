// Disposable synthetic identities for local manual/browser QA. Never production.
import { randomUUID, randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { readEnv } from '../config/env.js';
import { createDatabase } from '../config/database.js';
import { hashPassword } from '../modules/auth/auth.routes.js';
const env = readEnv();
if (!env.demo) throw new Error('Requires DEMO_CONTENT=true outside production.');
const db = createDatabase(env.databaseUrl);
try {
  const school = await db('schools').where({ is_demo: true }).first();
  if (!school) throw new Error('Seed demo first.');
  const cls = await db('classes').where({ school_id: school.id }).first();
  const password = process.env.BROWSER_TEST_PASSWORD || randomBytes(24).toString('base64url');
  const hash = await hashPassword(password);
  for (const [username, role] of [
    ['qa.operator', 'superadmin'],
    ['qa.teacher', 'bk'],
    ['qa.transfer', 'siswa'],
  ]) {
    let u = await db('users').where({ username_normalized: username }).first();
    if (!u) {
      const id = randomUUID();
      await db('users').insert({
        id,
        school_id: school.id,
        username_normalized: username,
        display_name: `Data contoh ${role}`,
        password_hash: hash,
        role,
        status: 'approved',
      });
      u = { id };
      if (role === 'siswa')
        await db('student_profiles').insert({
          user_id: id,
          school_id: school.id,
          class_id: cls.id,
          participant_id: randomUUID(),
        });
      if (role === 'bk') {
        await db('teacher_profiles').insert({ user_id: id, school_id: school.id });
        await db('teacher_class_assignments').insert({
          teacher_id: id,
          class_id: cls.id,
          school_id: school.id,
        });
      }
    }
  }
  await db('schools').where({ id: school.id }).update({
    service_enabled: true,
    service_contact: 'Kontak sintetis untuk pengujian lokal',
    service_hours: 'Jam sintetis — bukan layanan nyata',
  });
  await writeFile(
    '.local/browser-fixtures.json',
    JSON.stringify({
      usernames: ['qa.operator', 'qa.teacher', 'qa.transfer'],
      password,
      note: 'Password applies only to newly created fixtures.',
    }),
    { mode: 0o600 }
  );
  console.log('Synthetic QA fixture credentials saved privately in .local/browser-fixtures.json.');
  console.log(JSON.stringify({ classId: cls.id }));
} finally {
  await db.destroy();
}
