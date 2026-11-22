import { retain } from '../jobs/retention.js';
export async function runRetentionJob(db, options = {}) {
  try {
    return await db.transaction(async (trx) => {
      const lock = await trx.raw('SELECT pg_try_advisory_xact_lock(812462) AS acquired');
      if (!lock.rows[0].acquired) return { skipped: true };
      return { skipped: false, ...(await retain(trx, options)) };
    });
  } catch (e) {
    await db('job_runs')
      .insert({ job: 'retention_failed', deleted_count: 0 })
      .catch(() => {});
    throw e;
  }
}
