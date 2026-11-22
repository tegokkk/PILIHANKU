import { randomUUID } from 'node:crypto';
import { readEnv } from '../config/env.js';
import { createDatabase } from '../config/database.js';
import { username, password, text, z } from '../middleware/validate.js';
import { hashPassword } from '../modules/auth/auth.routes.js';
import { audit } from '../modules/audit/audit.js';
const env = readEnv(),
  db = createDatabase(env.databaseUrl);
try {
  const input = z
    .object({ username, password, school: text(100).min(1), timezone: z.string() })
    .parse({
      username: process.env.BOOTSTRAP_USERNAME,
      password: process.env.BOOTSTRAP_PASSWORD,
      school: process.env.BOOTSTRAP_SCHOOL_NAME,
      timezone: process.env.BOOTSTRAP_TIMEZONE || 'Asia/Jakarta',
    });
  new Intl.DateTimeFormat('id', { timeZone: input.timezone });
  const hash = await hashPassword(input.password);
  await db.transaction(async (trx) => {
    await trx.raw('SELECT pg_advisory_xact_lock(812461)');
    if (await trx('users').where({ role: 'superadmin' }).first())
      throw new Error('Initial superadmin already exists; bootstrap refused.');
    const schoolId = randomUUID(),
      id = randomUUID();
    await trx('schools').insert({
      id: schoolId,
      name: input.school,
      timezone: input.timezone,
      is_demo: env.demo,
    });
    await trx('users').insert({
      id,
      school_id: schoolId,
      username_normalized: input.username,
      display_name: 'Superadmin',
      password_hash: hash,
      role: 'superadmin',
      status: 'approved',
    });
    await audit(trx, id, 'superadmin.bootstrapped', id);
  });
  console.log(
    'Initial superadmin created. Remove BOOTSTRAP_PASSWORD from operational environment after secure handoff.'
  );
} finally {
  await db.destroy();
}
