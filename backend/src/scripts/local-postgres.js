// Optional development helper: actual PostgreSQL binaries, never used in production.
import EmbeddedPostgres from 'embedded-postgres';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

if (process.env.NODE_ENV === 'production')
  throw new Error('Local database helper is development only.');
const base = path.resolve('.local');
await mkdir(base, { recursive: true });
const credentialsPath = path.join(base, 'postgres.json');
let credentials;
try {
  credentials = JSON.parse(await readFile(credentialsPath, 'utf8'));
} catch {
  credentials = { user: 'pilihanku', password: randomBytes(32).toString('hex'), port: 55432 };
  await writeFile(credentialsPath, JSON.stringify(credentials), { mode: 0o600 });
}
const cluster = new EmbeddedPostgres({
  databaseDir: path.join(base, 'postgres'),
  ...credentials,
  persistent: true,
  authMethod: 'scram-sha-256',
  autoRehydrateSymlinks: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: () => {},
});
try {
  await access(path.join(base, 'postgres', 'PG_VERSION'));
} catch {
  await cluster.initialise();
}
await cluster.start();
const client = cluster.getPgClient();
await client.connect();
for (const name of ['pilihanku', 'pilihanku_test']) {
  const r = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [name]);
  if (!r.rowCount) await client.query(`CREATE DATABASE ${name}`);
}
await client.end();
try {
  await access('.env');
} catch {
  const url = `postgresql://${credentials.user}:${credentials.password}@127.0.0.1:${credentials.port}/`;
  await writeFile(
    '.env',
    `NODE_ENV=development\nPORT=3001\nAPP_ORIGIN=http://localhost:5173\nDATABASE_URL=${url}pilihanku\nTEST_DATABASE_URL=${url}pilihanku_test\nSESSION_SECRET=${randomBytes(48).toString('hex')}\nDEMO_CONTENT=true\nBOOTSTRAP_USERNAME=operator.local\nBOOTSTRAP_PASSWORD=${randomBytes(24).toString('base64url')}\nBOOTSTRAP_SCHOOL_NAME=Sekolah Contoh\nBOOTSTRAP_TIMEZONE=Asia/Jakarta\n`,
    { mode: 0o600 }
  );
}
console.log(
  'Local PostgreSQL ready on 127.0.0.1:55432. Development environment saved to backend/.env (ignored).'
);
const stop = async () => {
  await cluster.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 30000);
