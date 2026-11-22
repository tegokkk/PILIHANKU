import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z, text, username, password, uuid, parse } from '../../middleware/validate.js';
import { allow } from '../../middleware/authenticate.js';
import { hashPassword } from '../auth/auth.routes.js';
import { audit } from '../audit/audit.js';
import { fail } from '../../utils/api-error.js';
import { pageQuery, paginate } from '../../utils/pagination.js';
const classIdsSchema = z
  .array(uuid)
  .max(50)
  .refine((ids) => new Set(ids).size === ids.length, 'Penugasan kelas harus berbeda.');
export function usersRoutes(db) {
  const router = Router();
  router.use(allow('superadmin'));
  router.get('/', async (req, res) => {
    const { page } = pageQuery.parse(req.query);
    const result = await paginate(
      db('users')
        .where({ school_id: req.user.school_id })
        .whereNot('role', 'superadmin')
        .select(
          'id',
          'username_normalized',
          'display_name',
          'role',
          'status',
          'must_change_password'
        )
        .orderBy('display_name')
        .orderBy('id'),
      page
    );
    const items = result.items;
    const assignments = await db('teacher_class_assignments')
      .where({ school_id: req.user.school_id })
      .whereIn(
        'teacher_id',
        items.map((u) => u.id)
      )
      .select('teacher_id', 'class_id');
    res.json({
      data: {
        ...result,
        items: items.map((u) => ({
          ...u,
          classIds: assignments.filter((a) => a.teacher_id === u.id).map((a) => a.class_id),
        })),
      },
    });
  });
  router.post('/bk', async (req, res) => {
    const input = parse(
      z
        .object({
          username,
          displayName: text(50).min(1),
          password,
          classIds: classIdsSchema,
        })
        .strict(),
      req.body
    );
    const id = randomUUID(),
      passwordHash = await hashPassword(input.password);
    await db.transaction(async (trx) => {
      const cls = await trx('classes')
        .where({ school_id: req.user.school_id })
        .whereIn('id', input.classIds);
      fail(
        cls.length === new Set(input.classIds).size,
        422,
        'CLASS_INVALID',
        'Kelas tidak tersedia.'
      );
      await trx('users').insert({
        id,
        school_id: req.user.school_id,
        username_normalized: input.username,
        display_name: input.displayName,
        password_hash: passwordHash,
        role: 'bk',
        status: 'approved',
        must_change_password: true,
      });
      await trx('teacher_profiles').insert({ user_id: id, school_id: req.user.school_id });
      if (input.classIds.length)
        await trx('teacher_class_assignments').insert(
          input.classIds.map((class_id) => ({
            teacher_id: id,
            class_id,
            school_id: req.user.school_id,
          }))
        );
      await audit(trx, req.user.id, 'bk.created', id);
    });
    res.status(201).json({ data: { id } });
  });
  router.patch('/:id/status', async (req, res) => {
    const id = parse(uuid, req.params.id),
      input = parse(z.object({ status: z.enum(['approved', 'suspended']) }).strict(), req.body);
    await db.transaction(async (trx) => {
      const user = await trx('users')
        .where({ id, school_id: req.user.school_id })
        .whereNot('role', 'superadmin')
        .forUpdate()
        .first();
      fail(user, 404, 'NOT_FOUND', 'Akun tidak tersedia.');
      fail(
        ['approved', 'suspended'].includes(user.status),
        409,
        'APPROVAL_REQUIRED',
        'Gunakan alur persetujuan untuk akun pending/rejected.'
      );
      if (user.role === 'siswa') {
        const reg = await trx('student_registrations')
          .where({ user_id: id, status: 'approved' })
          .first();
        fail(reg, 409, 'APPROVAL_REQUIRED', 'Persetujuan siswa diperlukan.');
      }
      await trx('users')
        .where({ id })
        .update({ status: input.status, session_version: trx.raw('session_version + 1') });
      await audit(trx, req.user.id, `account.${input.status}`, id);
    });
    res.json({ data: { updated: true } });
  });
  router.post('/:id/reset', async (req, res) => {
    const id = parse(uuid, req.params.id),
      input = parse(z.object({ password, verificationNote: text(200).min(10) }).strict(), req.body);
    const user = await db('users')
      .where({ id, school_id: req.user.school_id })
      .whereNot('role', 'superadmin')
      .first();
    fail(user, 404, 'NOT_FOUND', 'Akun tidak tersedia.');
    await db.transaction(async (trx) => {
      await trx('users')
        .where({ id })
        .update({
          password_hash: await hashPassword(input.password),
          must_change_password: true,
          session_version: trx.raw('session_version + 1'),
        });
      await audit(trx, req.user.id, 'account.reset.school-verified', id);
    });
    res.json({ data: { reset: true } });
  });
  router.put('/:id/assignments', async (req, res) => {
    const id = parse(uuid, req.params.id),
      input = parse(z.object({ classIds: classIdsSchema }).strict(), req.body);
    await db.transaction(async (trx) => {
      const u = await trx('users')
        .where({ id, school_id: req.user.school_id, role: 'bk' })
        .forUpdate()
        .first();
      fail(u, 404, 'NOT_FOUND', 'Akun BK tidak tersedia.');
      const classes = await trx('classes')
        .where({ school_id: req.user.school_id })
        .whereIn('id', input.classIds);
      fail(
        classes.length === new Set(input.classIds).size,
        422,
        'CLASS_INVALID',
        'Kelas tidak tersedia.'
      );
      await trx('teacher_class_assignments').where({ teacher_id: id }).del();
      if (input.classIds.length)
        await trx('teacher_class_assignments').insert(
          input.classIds.map((class_id) => ({
            teacher_id: id,
            class_id,
            school_id: req.user.school_id,
          }))
        );
      await trx('users').where({ id }).increment('session_version', 1);
      await audit(trx, req.user.id, 'bk.assignments', id);
    });
    res.json({ data: { updated: true } });
  });
  return router;
}
