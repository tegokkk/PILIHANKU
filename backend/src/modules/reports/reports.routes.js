import { Router } from 'express';
import { allow, teacherClass } from '../../middleware/authenticate.js';
import { uuid, parse } from '../../middleware/validate.js';
import { categories } from '../content/materials.js';
const topics = ['Minat/jurusan', 'Kerja/pelatihan', 'Biaya', 'Diskusi keluarga', 'Lainnya'];
// Conservative complementary suppression: hide the entire behavioral vector if
// either a cell OR its complement could reveal 1–4 contributors.
export function protectAggregate(n, counts) {
  if (n < 5 || counts.some((c) => (c > 0 && c < 5) || (n - c > 0 && n - c < 5)))
    return { suppressed: true, message: 'Data belum cukup' };
  return {
    suppressed: false,
    contributors: n,
    started: counts[0],
    plans: counts[1],
    categories: Object.fromEntries(categories.map((k, i) => [k, counts[i + 2]])),
    ...(counts.length > 6
      ? { topics: Object.fromEntries(topics.map((k, i) => [k, counts[i + 6]])) }
      : {}),
  };
}
export function reportRoutes(db) {
  const router = Router();
  router.use(allow('bk'));
  router.get('/:id/summary', async (req, res) => {
    const cls = await teacherClass(db, req.user, parse(uuid, req.params.id));
    // Only scalar counts leave PostgreSQL. No reflection JSON or contributor IDs
    // are transferred to the API process, even before privacy suppression.
    const bindings = [cls.id, req.user.school_id];
    const categorySql = categories.map((category, i) => {
      bindings.push(JSON.stringify([category]));
      return `count(*) FILTER (WHERE data->'explored' @> ?::jsonb)::int AS category_${i}`;
    });
    const topicSql = topics.map((topic, i) => {
      bindings.push(topic);
      return `count(DISTINCT x.sender_id) FILTER (WHERE x.topic = ?)::int AS topic_${i}`;
    });
    bindings.push(cls.id);
    const result = await db.raw(
      `WITH contributors AS MATERIALIZED (
      SELECT e.user_id,e.data FROM exploration e
      JOIN student_profiles p ON p.user_id=e.user_id
      JOIN users u ON u.id=e.user_id
      WHERE p.class_id=? AND p.school_id=? AND e.aggregate_consent=true AND u.status='approved'
    ), behavior AS (
      SELECT count(*)::int AS contributors,
        count(*) FILTER (WHERE data->'answers' <> '{}'::jsonb
          OR jsonb_array_length(data->'plan'->'tasks') > 0
          OR jsonb_array_length(data->'comparison'->'options') > 0)::int AS started,
        count(*) FILTER (WHERE jsonb_array_length(data->'plan'->'tasks') >= 3)::int AS plans,
        ${categorySql.join(',')}
      FROM contributors
    ), needs AS (
      SELECT ${topicSql.join(',')}
      FROM consultations x JOIN contributors e ON e.user_id=x.sender_id
      WHERE x.class_id=? AND x.status <> 'Dibatalkan'
    ) SELECT behavior.*,needs.* FROM behavior CROSS JOIN needs`,
      bindings
    );
    const row = result.rows[0];
    res.json({
      data: protectAggregate(row.contributors, [
        row.started,
        row.plans,
        ...categories.map((_, i) => row[`category_${i}`]),
        ...topics.map((_, i) => row[`topic_${i}`]),
      ]),
    });
  });
  return router;
}
