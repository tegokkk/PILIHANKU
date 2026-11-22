import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { readEnv } from '../config/env.js';
import { createDatabase } from '../config/database.js';
import { codeHash } from '../modules/classes/classes.routes.js';
const env = readEnv();
if (!env.demo) throw new Error('DEMO_CONTENT=true in non-production is required.');
const db = createDatabase(env.databaseUrl);
try {
  const school = await db('schools').where({ is_demo: true }).first();
  if (!school) throw new Error('Bootstrap a demo school first.');
  if (await db('classes').where({ school_id: school.id }).first()) {
    console.log('Demo classes already exist. No changes.');
  } else {
    const code = randomBytes(12).toString('base64url');
    const id = randomUUID();
    await db('classes').insert({
      id,
      school_id: school.id,
      label: 'XI-A · Data contoh',
      grade: 'XI',
      academic_year: '2026/2027',
      retention_end_at: '2027-06-30T16:59:59Z',
      join_code_hash: codeHash(code),
    });
    await mkdir('.local', { recursive: true });
    await writeFile('.local/demo-class.json', JSON.stringify({ classId: id, classCode: code }), {
      mode: 0o600,
    });
    console.log(
      'Demo class created. Join code saved privately in backend/.local/demo-class.json. No student or BK accounts seeded.'
    );
  }
} finally {
  await db.destroy();
}
