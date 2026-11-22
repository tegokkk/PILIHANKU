import { Router } from 'express';
import { z, text, uuid, parse } from '../../middleware/validate.js';
import { allow } from '../../middleware/authenticate.js';
import { decide } from './approvals.service.js';
export function approvalRoutes(db) {
  const router = Router();
  router.use(allow('superadmin'));
  router.get('/', async (req, res) => {
    const { status, page } = parse(
      z.object({
        status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
        page: z.coerce.number().int().min(1).max(10000).default(1),
      }),
      req.query
    );
    const q = db('student_registrations as r')
      .join('users as u', 'u.id', 'r.user_id')
      .join('classes as c', 'c.id', 'r.requested_class_id')
      .where({ 'r.school_id': req.user.school_id, 'r.status': status });
    const [{ count }] = await q.clone().count();
    const items = await q
      .select(
        'r.id',
        'u.username_normalized',
        'u.display_name',
        'c.label',
        'c.academic_year',
        'r.status',
        'r.submitted_at',
        'r.rejection_reason'
      )
      .orderBy('r.submitted_at', 'desc')
      .limit(20)
      .offset((page - 1) * 20);
    res.json({ data: { items, total: Number(count), page } });
  });
  router.get('/activity', async (req, res) => {
    const items = await db('audit_events as e')
      .join('users as u', 'u.id', 'e.actor_id')
      .where({ 'u.school_id': req.user.school_id })
      .select(
        'e.id',
        'e.action',
        'e.created_at',
        'u.display_name as actor_name',
        'u.role as actor_role'
      )
      .orderBy('e.created_at', 'desc')
      .limit(50);
    res.json({ data: { items } });
  });
  for (const decision of ['approve', 'reject'])
    router.post(`/:id/${decision}`, async (req, res) => {
      const id = parse(uuid, req.params.id);
      const input = parse(
        z
          .object({ reason: decision === 'reject' ? text(200).min(3) : text(200).optional() })
          .strict(),
        req.body
      );
      res.json({
        data: await decide(
          db,
          req.user,
          id,
          decision === 'approve' ? 'approved' : 'rejected',
          input.reason
        ),
      });
    });
  return router;
}
