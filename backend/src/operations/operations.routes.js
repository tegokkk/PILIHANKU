import { Router } from 'express';
import { allow } from '../middleware/authenticate.js';
export function operationsRoutes(db, app) {
  const router = Router();
  router.use(allow('superadmin'));
  router.get('/', async (req, res) => {
    const retention = await db('job_runs')
      .where({ job: 'retention' })
      .orderBy('completed_at', 'desc')
      .first('completed_at');
    const age = retention ? Date.now() - new Date(retention.completed_at).getTime() : null;
    const failure = await db('job_runs')
      .where({ job: 'retention_failed' })
      .orderBy('completed_at', 'desc')
      .first('completed_at');
    const failed =
      !!failure &&
      (!retention || new Date(failure.completed_at) > new Date(retention.completed_at));
    res.json({
      data: {
        draining: app.locals.draining,
        requests: { ...app.locals.requestMetrics },
        retention: {
          lastSuccessAt: retention?.completed_at ?? null,
          lastFailureAt: failure?.completed_at ?? null,
          failed,
          stale: failed || age === null || age > 90 * 60000,
        },
      },
    });
  });
  return router;
}
