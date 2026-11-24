import 'dotenv/config';
export function readEnv(source = process.env) {
  if (source.NODE_ENV && !['development', 'test', 'production'].includes(source.NODE_ENV))
    throw new Error('NODE_ENV must be development, test, or production.');
  const production = source.NODE_ENV === 'production';
  if (production && source.DEMO_CONTENT === 'true')
    throw new Error('DEMO_CONTENT must be disabled in production.');
  if (
    !source.DATABASE_URL ||
    !source.SESSION_SECRET ||
    source.SESSION_SECRET.length < 32 ||
    source.SESSION_SECRET.startsWith('REPLACE_')
  )
    throw new Error('Set DATABASE_URL and a random SESSION_SECRET of at least 32 characters.');
  const origin = new URL(source.APP_ORIGIN || 'http://localhost:5173').origin;
  const port = Number(source.PORT || 3001),
    trustProxy = Number(source.TRUST_PROXY || 0),
    pendingDays = Number(source.PENDING_RETENTION_DAYS || 90);
  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    ![0, 1].includes(trustProxy) ||
    !Number.isInteger(pendingDays) ||
    pendingDays < 1 ||
    pendingDays > 365
  )
    throw new Error('Invalid PORT, TRUST_PROXY (0/1), or PENDING_RETENTION_DAYS (1–365).');
  if (!['postgres:', 'postgresql:'].includes(new URL(source.DATABASE_URL).protocol))
    throw new Error('DATABASE_URL must use PostgreSQL.');
  if (production && !origin.startsWith('https://'))
    throw new Error('Production requires HTTPS APP_ORIGIN');
  const registrationClassId = source.REGISTRATION_CLASS_ID || null;
  if (
    registrationClassId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(registrationClassId)
  )
    throw new Error('REGISTRATION_CLASS_ID must be a class UUID.');
  return {
    production,
    requestLogs: source.LOG_REQUESTS === 'true' || (production && source.LOG_REQUESTS !== 'false'),
    bootstrapConfigured: Boolean(source.BOOTSTRAP_PASSWORD),
    origin,
    port,
    bindHost: source.BIND_HOST || '127.0.0.1',
    databaseUrl: source.DATABASE_URL,
    sessionSecret: source.SESSION_SECRET,
    trustProxy,
    demo: source.DEMO_CONTENT === 'true' && !production,
    pendingDays,
    registrationClassId,
  };
}
