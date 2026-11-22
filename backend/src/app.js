import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { ZodError } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { csrf } from './middleware/csrf.js';
import { identity, requireAuth } from './middleware/authenticate.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { approvalRoutes } from './modules/approvals/approvals.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { classesRoutes } from './modules/classes/classes.routes.js';
import { explorationRoutes } from './modules/exploration/exploration.routes.js';
import { authenticatedContent, editorialRoutes } from './modules/content/content.routes.js';
import {
  consultationRoutes,
  teacherConsultations,
} from './modules/consultations/consultations.routes.js';
import { reportRoutes } from './modules/reports/reports.routes.js';
import { ApiError } from './utils/api-error.js';
import { PostgresRateLimitStore } from './middleware/rate-limit-store.js';
import { operationsRoutes } from './operations/operations.routes.js';
export function createApp(db, env) {
  const app = express();
  app.disable('x-powered-by');
  if (env.trustProxy) app.set('trust proxy', env.trustProxy);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'img-src': ["'self'", 'data:'],
          'font-src': ["'self'"],
          'connect-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
        },
      },
    })
  );
  // Set this before parsers/session storage so failures cannot become cacheable.
  app.use('/api', (req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' });
    const started = performance.now();
    const metrics = app.locals.requestMetrics;
    metrics.total++;
    metrics.active++;
    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      metrics.active--;
      const status = res.writableFinished ? res.statusCode : 499;
      if (status === 499) metrics.aborted++;
      const durationMs = Math.round(performance.now() - started);
      if (res.statusCode >= 500) metrics.serverErrors++;
      if (durationMs >= 1000) metrics.slow++;
      if (env.requestLogs)
        console.log(
          JSON.stringify({
            event: 'http_request',
            method: req.method,
            route: typeof req.route?.path === 'string' ? req.route.path : 'unmatched',
            status,
            durationMs,
          })
        );
    };
    res.once('finish', finish);
    res.once('close', finish);
    next();
  });
  app.locals.requestMetrics = { total: 0, active: 0, serverErrors: 0, slow: 0, aborted: 0 };
  app.locals.draining = false;
  // Health checks do not depend on a session or a writable rate-limit store.
  app.get('/api/health/live', (req, res) =>
    res
      .status(app.locals.draining ? 503 : 200)
      .json({ data: { status: app.locals.draining ? 'draining' : 'ok' } })
  );
  app.get('/api/health', async (req, res) => {
    if (app.locals.draining) return res.status(503).json({ data: { status: 'draining' } });
    try {
      const result = await db.raw(
        "SELECT to_regclass('public.sessions') AS sessions,to_regclass('public.rate_limit_buckets') AS limits"
      );
      if (!result.rows[0].sessions || !result.rows[0].limits)
        return res.status(503).json({ data: { status: 'migration_required' } });
      return res.json({ data: { status: 'ok', database: 'connected' } });
    } catch {
      return res.status(503).json({ data: { status: 'unavailable', database: 'unavailable' } });
    }
  });
  const limitedMessage = {
    error: { code: 'RATE_LIMIT', message: 'Terlalu banyak percobaan. Coba lagi nanti.' },
  };
  const makeLimiter = (prefix, limit, extra = {}) =>
    rateLimit({
      windowMs: 15 * 60000,
      limit: env.test ? 10000 : limit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: limitedMessage,
      store: new PostgresRateLimitStore(db, prefix, env.sessionSecret),
      ...extra,
    });
  // Bound anonymous session creation and invalid credentials without pooling all
  // student consultation traffic into the school's shared public IP allowance.
  app.use('/api', makeLimiter('perimeter', 10000));
  app.use(express.json({ limit: '256kb', inflate: false }));
  const Store = pgSession(session);
  const store = new Store({
    conObject: {
      connectionString: env.databaseUrl,
      connectionTimeoutMillis: 5000,
      statement_timeout: 15000,
      query_timeout: 15000,
      max: env.serverless ? 2 : 5,
    },
    tableName: 'sessions',
    createTableIfMissing: false,
    pruneSessionInterval: env.serverless ? false : 600,
    errorLog: () => console.error('session_store_failed'),
  });
  app.locals.sessionStore = store;
  app.use(
    session({
      store,
      name: 'pilihanku.sid',
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: env.production,
        sameSite: 'lax',
        maxAge: 30 * 60000,
        path: '/',
      },
    })
  );
  app.use('/api', identity(db));
  const limiter = makeLimiter('auth', 40, {
    keyGenerator: (req) =>
      `${ipKeyGenerator(req.ip)}:${String(req.body?.username || '')
        .trim()
        .toLowerCase()
        .slice(0, 30)}`,
  });
  const accountLimiter = makeLimiter('account-actions', 40, { keyGenerator: (req) => req.user.id });
  const authIpLimiter = makeLimiter('auth-ip', 400);
  app.use(
    '/api/auth',
    (req, res, next) => {
      if (
        req.method === 'POST' &&
        ['/login', '/register', '/class-context', '/status', '/password'].includes(req.path)
      )
        return authIpLimiter(req, res, next);
      next();
    },
    csrf(env.origin),
    authRoutes(db, limiter, env)
  );
  app.use('/api/auth', (req, res) =>
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint tidak tersedia.' } })
  );
  // Authentication precedes CSRF and validation for every application endpoint.
  app.use('/api', requireAuth, csrf(env.origin));
  app.use('/api/admin/operations', operationsRoutes(db, app));
  app.use('/api/admin/registrations', approvalRoutes(db));
  app.use('/api/admin/users', usersRoutes(db));
  app.use('/api/classes', classesRoutes(db));
  app.use('/api/me', explorationRoutes(db));
  app.use('/api', authenticatedContent(db, env, accountLimiter));
  app.use('/api/teacher/cards', editorialRoutes(db));
  app.use('/api/consultations', consultationRoutes(db, accountLimiter));
  app.use('/api/teacher/consultations', teacherConsultations(db));
  app.use('/api/teacher/classes', reportRoutes(db));
  app.use('/api', (req, res) =>
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint tidak tersedia.' } })
  );
  if (env.production && !env.serverless) {
    const directory = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));
    app.use(express.static(directory, { index: false }));
    app.get('/{*path}', identity(db), (req, res) => {
      res.set('Cache-Control', 'no-store');
      if (!req.user && !['/', '/mulai'].includes(req.path)) return res.redirect('/mulai?tab=masuk');
      return res.sendFile(path.join(directory, 'index.html'));
    });
  }
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (
      ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', '57P01', '57P03', '08006'].includes(err.code) ||
      err.name === 'KnexTimeoutError'
    )
      return res.status(503).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Layanan sedang pulih. Silakan coba kembali.',
        },
      });
    const parserErrors = {
      'entity.parse.failed': [400, 'INVALID_JSON', 'Format JSON tidak valid.'],
      'entity.too.large': [413, 'BODY_TOO_LARGE', 'Ukuran permintaan melebihi batas 256 KB.'],
      'encoding.unsupported': [415, 'UNSUPPORTED_ENCODING', 'Kirim JSON tanpa kompresi.'],
      'charset.unsupported': [415, 'UNSUPPORTED_CHARSET', 'Gunakan JSON dengan UTF-8.'],
      'request.aborted': [400, 'REQUEST_ABORTED', 'Permintaan terputus sebelum lengkap.'],
    };
    if (parserErrors[err.type]) {
      const [status, code, message] = parserErrors[err.type];
      return res.status(status).json({ error: { code, message } });
    }
    if (err instanceof ZodError)
      return res.status(422).json({
        error: {
          code: 'VALIDATION',
          message: 'Periksa kembali isian.',
          fields: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      });
    if (err.code === '23505')
      return res.status(409).json({
        error: { code: 'DUPLICATE', message: 'Username atau data unik sudah digunakan.' },
      });
    const status = err instanceof ApiError ? err.status : 500;
    if (status === 500)
      console.error('request_failed', { method: req.method, code: err.code || 'INTERNAL' });
    res.status(status).json({
      error: {
        code: status === 500 ? 'INTERNAL' : err.code,
        message: status === 500 ? 'Operasi gagal. Silakan coba kembali.' : err.message,
      },
    });
  });
  return app;
}
