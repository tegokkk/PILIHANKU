import { Router } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { z, text, uuid, parse, dateOnly } from '../../middleware/validate.js';
import { allow, studentClass, teacherClass } from '../../middleware/authenticate.js';
import { fail } from '../../utils/api-error.js';
import { audit } from '../audit/audit.js';
import { deleteConsultation } from '../../jobs/deletion.js';
import { pageQuery, pageNumber, paginate } from '../../utils/pagination.js';
const sections = ['reflection', 'comparison', 'plan', 'discussion'];
const selectShares = (data, chosen) =>
  Object.fromEntries(
    chosen.map((k) => [
      k,
      k === 'reflection'
        ? { answers: data.answers, context: data.context, instrumentVersion: 'draft-reflection-1' }
        : data[k],
    ])
  );
async function own(db, req, id) {
  const row = await db('consultations').where({ id }).first();
  fail(
    row && req.user.role === 'siswa' && row.sender_id === req.user.id,
    404,
    'NOT_FOUND',
    'Permintaan tidak tersedia.'
  );
  const cls = await db('classes')
    .where({ id: row.class_id })
    .where('retention_end_at', '>', new Date())
    .first();
  fail(cls, 404, 'NOT_FOUND', 'Masa simpan permintaan berakhir.');
  return row;
}
const safeRow = (row) => {
  const {
    guest_token_hash: _guest,
    payload_hash: _payload,
    operation_key: _operation,
    ...safe
  } = row;
  return safe;
};
export function consultationRoutes(db, limiter) {
  const router = Router();
  router.use(allow('siswa'));
  router.use((req, res, next) =>
    ['GET', 'HEAD'].includes(req.method) ? next() : limiter(req, res, next)
  );
  router.post('/destinations', async (req, res) => {
    parse(z.object({}).strict(), req.body);
    const cls = await studentClass(db, req.user);
    const school = await db('schools').where({ id: cls.school_id }).first();
    fail(
      school.service_enabled && school.service_contact && school.service_hours,
      409,
      'SERVICE_UNCONFIGURED',
      'Sekolah belum mengaktifkan layanan. Cetak ringkasan atau hubungi guru secara langsung.'
    );
    const teachers = await db('teacher_class_assignments as a')
      .join('users as u', 'u.id', 'a.teacher_id')
      .where({ 'a.class_id': cls.id, 'u.status': 'approved', 'u.must_change_password': false })
      .select('u.id', 'u.display_name');
    res.json({
      data: {
        classId: cls.id,
        schoolName: school.name,
        contact: school.service_contact,
        hours: school.service_hours,
        timezone: school.timezone,
        teachers,
      },
    });
  });
  router.post('/', async (req, res) => {
    const input = parse(
      z
        .object({
          classId: uuid,
          teacherId: uuid,
          nickname: text(50).min(1),
          topic: z.enum([
            'Minat/jurusan',
            'Kerja/pelatihan',
            'Biaya',
            'Diskusi keluarga',
            'Lainnya',
          ]),
          preference: text(200).min(1),
          message: text(1000).min(10),
          sections: z
            .array(z.enum(sections))
            .max(4)
            .refine((a) => new Set(a).size === a.length),
          consent: z.literal(true),
        })
        .strict(),
      req.body
    );
    const key = parse(uuid, req.get('idempotency-key'));
    const student = await studentClass(db, req.user);
    fail(student.id === input.classId, 403, 'FORBIDDEN', 'Tujuan di luar kelas.');
    const payloadHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const id = await db.transaction(async (trx) => {
      const cls = await trx('classes')
        .where({ id: input.classId, active: true })
        .where('retention_end_at', '>', new Date())
        .forShare()
        .first();
      fail(cls, 422, 'DESTINATION_INVALID', 'Kelas tidak aktif.');
      const school = await trx('schools')
        .where({ id: cls.school_id, service_enabled: true })
        .first();
      fail(
        school?.service_contact && school?.service_hours,
        409,
        'SERVICE_UNCONFIGURED',
        'Layanan belum dikonfigurasi sekolah.'
      );
      const teacher = await trx('teacher_class_assignments as a')
        .join('users as u', 'u.id', 'a.teacher_id')
        .where({
          'a.class_id': cls.id,
          'u.id': input.teacherId,
          'u.role': 'bk',
          'u.status': 'approved',
          'u.must_change_password': false,
        })
        .first();
      fail(teacher, 422, 'DESTINATION_INVALID', 'Guru tujuan tidak aktif atau tidak berwenang.');
      const scope = { sender_id: req.user.id, operation_key: key };
      const existing = await trx('consultations').where(scope).first();
      if (existing) {
        fail(
          existing.payload_hash === payloadHash,
          409,
          'IDEMPOTENCY_CONFLICT',
          'Kunci ini telah dipakai untuk isi berbeda.'
        );
        return existing.id;
      }
      const saved = await trx('exploration').where({ user_id: req.user.id }).first();
      const data = saved?.data;
      fail(
        input.sections.length === 0 || data,
        422,
        'SHARES_UNAVAILABLE',
        'Simpan atau tinjau data sebelum berbagi.'
      );
      const newId = randomUUID();
      const inserted = await trx('consultations')
        .insert({
          id: newId,
          ...scope,
          sender_id: req.user?.id || null,
          guest_token_hash: null,
          teacher_id: input.teacherId,
          class_id: cls.id,
          nickname: input.nickname,
          topic: input.topic,
          preference: input.preference,
          message: input.message,
          shares: JSON.stringify(selectShares(data, input.sections)),
          consent_version: 'consultation-1',
          payload_hash: payloadHash,
        })
        .onConflict()
        .ignore()
        .returning('id');
      if (!inserted.length) {
        const previous = await trx('consultations').where(scope).first();
        fail(
          previous?.payload_hash === payloadHash,
          409,
          'IDEMPOTENCY_CONFLICT',
          'Kunci sudah digunakan untuk isi berbeda.'
        );
        return previous.id;
      }
      await audit(trx, req.user?.id, 'consultation.created', newId);
      return newId;
    });
    const current = await db('consultations')
      .where({ id, sender_id: req.user.id })
      .select('status')
      .first();
    fail(current, 409, 'REQUEST_REMOVED', 'Permintaan sudah dihapus. Muat daftar terbaru.');
    res.status(201).json({ data: { id, status: current.status } });
  });
  router.get('/', async (req, res) => {
    let q = db('consultations as x')
      .join('classes as c', 'c.id', 'x.class_id')
      .where('c.retention_end_at', '>', new Date());
    q = q.where('x.sender_id', req.user.id);
    res.json({
      data: await paginate(
        q
          .select(
            'x.id',
            'x.nickname',
            'x.topic',
            'x.status',
            'x.schedule',
            'x.created_at',
            'x.revision'
          )
          .orderBy('x.created_at', 'desc')
          .orderBy('x.id'),
        pageQuery.parse(req.query).page
      ),
    });
  });
  router.get('/:id', async (req, res) =>
    res.json({ data: safeRow(await own(db, req, parse(uuid, req.params.id))) })
  );
  router.post('/:id/cancel', async (req, res) => {
    const row = await own(db, req, parse(uuid, req.params.id));
    await db.transaction(async (trx) => {
      const current = await trx('consultations').where({ id: row.id }).forUpdate().first();
      fail(
        !['Selesai', 'Dibatalkan'].includes(current.status),
        409,
        'STATUS_CONFLICT',
        'Permintaan sudah ditutup.'
      );
      await trx('consultations')
        .where({ id: row.id })
        .update({ status: 'Dibatalkan', revision: trx.raw('revision+1'), updated_at: new Date() });
      await audit(trx, req.user?.id, 'consultation.cancelled', row.id);
    });
    res.json({ data: { cancelled: true } });
  });
  router.delete('/:id/shares/:section', async (req, res) => {
    const row = await own(db, req, parse(uuid, req.params.id));
    const section = parse(z.enum(sections), req.params.section);
    await db('consultations')
      .where({ id: row.id })
      .update({
        shares: db.raw('shares - ?', section),
        revision: db.raw('revision+1'),
        updated_at: new Date(),
      });
    await audit(db, req.user?.id, 'consultation.share.withdrawn', row.id);
    res.json({ data: { withdrawn: true } });
  });
  router.delete('/:id', async (req, res) => {
    const row = await own(db, req, parse(uuid, req.params.id));
    await deleteConsultation(db, row.id);
    res.json({ data: { deleted: true } });
  });
  return router;
}
const transitions = {
  Baru: ['Ditinjau', 'Dibatalkan'],
  Ditinjau: ['Dijadwalkan', 'Selesai', 'Dibatalkan'],
  Dijadwalkan: ['Ditinjau', 'Selesai', 'Dibatalkan'],
  Selesai: [],
  Dibatalkan: [],
};
export function teacherConsultations(db) {
  const router = Router();
  router.use(allow('bk'));
  router.get('/', async (req, res) => {
    const input = z
      .object({
        page: pageNumber,
        status: z.enum(Object.keys(transitions)).optional(),
        section: z.enum(['any', ...sections]).optional(),
      })
      .strict()
      .parse(req.query);
    const result = await paginate(
      db('consultations as x')
        .join('classes as c', 'c.id', 'x.class_id')
        .join('teacher_class_assignments as a', function () {
          this.on('a.class_id', '=', 'x.class_id').andOn('a.teacher_id', '=', 'x.teacher_id');
        })
        .where({ 'x.teacher_id': req.user.id, 'c.school_id': req.user.school_id, 'c.active': true })
        .where('c.retention_end_at', '>', new Date())
        .modify((q) => {
          if (input.status) q.where('x.status', input.status);
          if (input.section === 'any') q.whereRaw("x.shares <> '{}'::jsonb");
          else if (input.section) q.whereRaw('jsonb_exists(x.shares, ?)', [input.section]);
        })
        .select(
          'x.id',
          'x.nickname',
          'x.topic',
          'x.preference',
          'x.status',
          'x.revision',
          'x.created_at',
          db.raw('ARRAY(SELECT jsonb_object_keys(x.shares)) as shared_sections'),
          'c.label as class_label'
        )
        .orderBy('x.created_at', 'desc')
        .orderBy('x.id'),
      input.page
    );
    res.json({ data: result });
  });
  const authorized = async (trx, user, id) => {
    const row = await trx('consultations').where({ id, teacher_id: user.id }).first();
    fail(row, 404, 'NOT_FOUND', 'Permintaan tidak tersedia.');
    await teacherClass(trx, user, row.class_id);
    return row;
  };
  router.get('/:id', async (req, res) => {
    const row = await authorized(db, req.user, parse(uuid, req.params.id));
    res.json({ data: { ...safeRow(row), unshared: sections.filter((k) => !(k in row.shares)) } });
  });
  router.patch('/:id', async (req, res) => {
    const id = parse(uuid, req.params.id);
    const input = parse(
      z
        .object({
          status: z.enum(Object.keys(transitions)),
          revision: z.number().int().positive(),
          schedule: z
            .object({
              date: dateOnly,
              time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
              place: text(200).min(3),
            })
            .strict()
            .optional(),
        })
        .strict(),
      req.body
    );
    const data = await db.transaction(async (trx) => {
      await authorized(trx, req.user, id);
      const row = await trx('consultations').where({ id }).forUpdate().first();
      if (row.status === input.status && row.revision === input.revision + 1) {
        const previousSchedule = row.schedule;
        const sameSchedule =
          input.status === 'Dijadwalkan'
            ? input.schedule &&
              previousSchedule &&
              ['date', 'time', 'place'].every(
                (key) => input.schedule[key] === previousSchedule[key]
              )
            : !input.schedule;
        fail(
          sameSchedule,
          409,
          'STATUS_CONFLICT',
          'Isi percobaan ulang berbeda dari jadwal tersimpan.'
        );
        return { revision: row.revision, replayed: true };
      }
      fail(
        row.revision === input.revision && transitions[row.status].includes(input.status),
        409,
        'STATUS_CONFLICT',
        'Status telah berubah atau transisi tidak sah.'
      );
      let schedule = null;
      if (input.status === 'Dijadwalkan') {
        fail(input.schedule, 422, 'SCHEDULE_REQUIRED', 'Tanggal, waktu, dan tempat wajib diisi.');
        const school = await trx('schools').where({ id: req.user.school_id }).first();
        schedule = { ...input.schedule, timezone: school.timezone };
      } else
        fail(!input.schedule, 422, 'SCHEDULE_UNEXPECTED', 'Jadwal hanya untuk status Dijadwalkan.');
      await trx('consultations')
        .where({ id })
        .update({
          status: input.status,
          schedule: schedule ? JSON.stringify(schedule) : null,
          revision: row.revision + 1,
          updated_at: new Date(),
        });
      await audit(trx, req.user.id, `consultation.${input.status}`, id);
      return { revision: row.revision + 1 };
    });
    res.json({ data });
  });
  return router;
}
