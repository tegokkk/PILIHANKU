import { Router } from 'express';
import { allow, studentClass } from '../../middleware/authenticate.js';
import { explorationSchema } from './exploration.validation.js';
import { riasec, matrix, emptyExploration } from './calculations.js';
import { instrumentVersion } from '../content/materials.js';
import { fail } from '../../utils/api-error.js';
import { deleteUserData } from '../../jobs/deletion.js';
import { uuid } from '../../middleware/validate.js';
async function sourceNotices(db, user, data) {
  const options = data.comparison.options.filter((o) => uuid.safeParse(o.sourceId).success);
  if (!options.length) return [];
  const rows = await db('cards')
    .where({ school_id: user.school_id })
    .whereIn(
      'id',
      options.map((o) => o.sourceId)
    )
    .select('id', 'status', 'version');
  return options.flatMap((o) => {
    const row = rows.find((r) => r.id === o.sourceId);
    return !row || row.status !== 'published' || row.version !== o.version
      ? [
          {
            optionId: o.id,
            message: `Informasi ${o.title} telah berubah atau diarsipkan. Salinan versi ${o.version} dipertahankan; periksa sumber terbaru.`,
          },
        ]
      : [];
  });
}
export function explorationRoutes(db) {
  const router = Router();
  router.use(allow('siswa'));
  // Erasure must remain available when a class has expired or been disabled.
  router.delete('/data', async (req, res) => {
    await deleteUserData(db, req.user.id, 'self');
    await new Promise((resolve, reject) => req.session.destroy((e) => (e ? reject(e) : resolve())));
    res.clearCookie('pilihanku.sid', { path: '/' }).json({ data: { deleted: true } });
  });
  router.use(async (req, res, next) => {
    req.class = await studentClass(db, req.user);
    next();
  });
  router.get('/exploration', async (req, res) => {
    const row = await db('exploration').where({ user_id: req.user.id }).first();
    const data = row?.data || emptyExploration();
    res.json({
      data: {
        revision: row?.revision || 0,
        instrumentVersion: row?.instrument_version || instrumentVersion,
        aggregateConsent: row?.aggregate_consent || false,
        data,
        sourceNotices: await sourceNotices(db, req.user, data),
        results: { riasec: riasec(data.answers), matrix: matrix(data.comparison) },
        retentionEnd: req.class.retention_end_at,
      },
    });
  });
  router.put('/exploration', async (req, res) => {
    const input = explorationSchema.parse(req.body);
    const result = await db.transaction(async (trx) => {
      await trx('users')
        .where({ id: req.user.id, status: 'approved' })
        .forUpdate()
        .first()
        .then((u) => fail(u, 401, 'SESSION_REQUIRED', 'Akun tidak tersedia.'));
      const row = await trx('exploration').where({ user_id: req.user.id }).forUpdate().first();
      fail(
        (row?.revision || 0) === input.revision,
        409,
        'REVISION_CONFLICT',
        'Data di perangkat lain berubah. Draf tetap tersedia; muat versi terbaru atau ekspor salinan ini.'
      );
      const revision = input.revision + 1;
      const data = {
        user_id: req.user.id,
        revision,
        instrument_version: input.instrumentVersion,
        data: JSON.stringify(input.data),
        aggregate_consent: input.aggregateConsent,
        updated_at: new Date(),
        ...(!row || row.aggregate_consent !== input.aggregateConsent
          ? { aggregate_consent_at: new Date(), aggregate_consent_version: 'aggregate-1' }
          : {}),
      };
      if (row) await trx('exploration').where({ user_id: req.user.id }).update(data);
      else await trx('exploration').insert(data);
      return {
        revision,
        results: { riasec: riasec(input.data.answers), matrix: matrix(input.data.comparison) },
      };
    });
    res.json({ data: result });
  });
  return router;
}
