import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z, text, uuid, parse } from '../../middleware/validate.js';
import { allow } from '../../middleware/authenticate.js';
import { audit } from '../audit/audit.js';
import { fail } from '../../utils/api-error.js';
import { pageNumber, paginate } from '../../utils/pagination.js';
export function classesRoutes(db) {
  const router = Router();
  router.use(allow('superadmin', 'bk'));
  router.get('/', async (req, res) => {
    const input = z
      .object({ page: pageNumber, q: text(100).default('') })
      .strict()
      .parse(req.query);
    let q = db('classes').where({ school_id: req.user.school_id });
    if (input.q) q = q.whereILike('label', `%${input.q.replace(/[\\%_]/g, '\\$&')}%`);
    if (req.user.role === 'bk')
      q = q.whereIn(
        'id',
        db('teacher_class_assignments').where({ teacher_id: req.user.id }).select('class_id')
      );
    const result = await paginate(
      q
        .select('id', 'label', 'grade', 'academic_year', 'retention_end_at', 'active')
        .orderBy('label')
        .orderBy('id'),
      input.page
    );
    res.json({ data: result });
  });
  router.post('/', allow('superadmin'), async (req, res) => {
    const input = parse(
      z
        .object({
          label: text(100).min(1),
          grade: z.enum(['XI', 'XII']),
          academicYear: text(20).min(4),
          retentionEnd: z.string().datetime(),
        })
        .strict(),
      req.body
    );
    fail(
      new Date(input.retentionEnd) > new Date(),
      422,
      'DATE_INVALID',
      'Akhir retensi harus di masa depan.'
    );
    const id = randomUUID();
    await db('classes').insert({
      id,
      school_id: req.user.school_id,
      label: input.label,
      grade: input.grade,
      academic_year: input.academicYear,
      retention_end_at: input.retentionEnd,
    });
    await audit(db, req.user.id, 'class.created', id);
    res.status(201).json({ data: { id } });
  });
  router.patch('/:id', allow('superadmin'), async (req, res) => {
    const id = parse(uuid, req.params.id),
      input = parse(z.object({ active: z.boolean() }).strict(), req.body);
    const n = await db('classes')
      .where({ id, school_id: req.user.school_id })
      .update({ active: input.active });
    fail(n, 404, 'NOT_FOUND', 'Kelas tidak tersedia.');
    await audit(db, req.user.id, 'class.status', id);
    res.json({ data: { updated: true } });
  });
  router.get('/service', async (req, res) => {
    const data = await db('schools')
      .where({ id: req.user.school_id })
      .select('name', 'timezone', 'service_contact', 'service_hours', 'service_enabled')
      .first();
    res.json({ data });
  });
  router.put('/service', allow('superadmin'), async (req, res) => {
    const input = parse(
      z
        .object({
          contact: text(200).min(3),
          hours: text(200).min(3),
          timezone: text(100),
          enabled: z.boolean(),
        })
        .strict(),
      req.body
    );
    try {
      new Intl.DateTimeFormat('id', { timeZone: input.timezone });
    } catch {
      fail(false, 422, 'TIMEZONE', 'Zona waktu tidak valid.');
    }
    await db('schools').where({ id: req.user.school_id }).update({
      service_contact: input.contact,
      service_hours: input.hours,
      timezone: input.timezone,
      service_enabled: input.enabled,
    });
    await audit(db, req.user.id, 'service.configured', req.user.school_id);
    res.json({ data: { updated: true } });
  });
  return router;
}
