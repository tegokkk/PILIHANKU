import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z, text, uuid, parse, dateOnly } from '../../middleware/validate.js';
import { allow } from '../../middleware/authenticate.js';
import {
  questions,
  dimensions,
  values,
  scenarios,
  categories,
  instrumentVersion,
  demoCards,
} from './materials.js';
import { fail } from '../../utils/api-error.js';
import { audit } from '../audit/audit.js';
import { pageQuery, paginate } from '../../utils/pagination.js';
export function authenticatedContent(db, env, limiter) {
  const router = Router();
  router.get('/materials', (req, res) =>
    res.json({
      data: {
        questions,
        dimensions,
        values,
        scenarios,
        categories,
        instrumentVersion,
        label: 'Draf refleksi dan simulasi — belum ditelaah ahli; bukan tes psikologis baku.',
      },
    })
  );
  router.get('/cards', async (req, res) => {
    const input = parse(
      z
        .object({
          q: text(200).default(''),
          category: z.enum(categories).optional(),
          interests: z
            .string()
            .regex(/^[RIASEC](,[RIASEC]){0,5}$/)
            .optional(),
          page: z.coerce.number().int().min(1).max(100000).default(1),
          limit: z.coerce.number().int().min(1).max(40).default(24),
        })
        .strict(),
      req.query
    );
    const interests = input.interests?.split(',') || [],
      needle = input.q.toLowerCase(),
      offset = (input.page - 1) * input.limit;
    const query = db('cards as c')
      .where('c.status', 'published')
      .modify((q) => {
        q.where('c.school_id', req.user.school_id);
        if (input.category) q.where('c.category', input.category);
        if (needle)
          q.whereRaw(
            "concat_ws(' ',c.title,c.data->>'summary',c.data->>'subjects',c.data->>'activities') ILIKE ?",
            [`%${needle.replace(/[\\%_]/g, '\\$&')}%`]
          );
        if (interests.length)
          q.where(function () {
            for (const interest of interests)
              this.orWhereRaw('c.data @> ?::jsonb', [JSON.stringify({ interests: [interest] })]);
          });
      });
    const [{ count }] = await query.clone().count(),
      dbCount = Number(count);
    const rows =
      offset < dbCount
        ? await query
            .select(
              'c.id',
              'c.title',
              'c.category',
              'c.status',
              'c.version',
              'c.data',
              'c.verified_at',
              'c.updated_at'
            )
            .orderBy('c.title')
            .orderBy('c.id')
            .limit(input.limit)
            .offset(offset)
        : [];
    const examples = env.demo
      ? demoCards.filter(
          (c) =>
            (!input.category || c.category === input.category) &&
            (!interests.length || interests.some((i) => c.data.interests.includes(i))) &&
            `${c.title} ${c.data.summary} ${c.data.subjects} ${c.data.activities}`
              .toLowerCase()
              .includes(needle)
        )
      : [];
    res.json({
      data: {
        items: [
          ...rows,
          ...examples.slice(
            Math.max(0, offset - dbCount),
            Math.max(0, offset - dbCount) + input.limit - rows.length
          ),
        ],
        total: dbCount + examples.length,
        page: input.page,
        pageSize: input.limit,
      },
    });
  });
  router.post('/cards/:id/report-source', limiter, async (req, res) => {
    const id = parse(uuid, req.params.id),
      input = parse(z.object({ issue: z.enum(['unavailable', 'outdated']) }).strict(), req.body);
    const card = await db('cards')
      .where({ id, status: 'published' })
      .modify((q) => {
        q.where('school_id', req.user.school_id);
      })
      .first();
    fail(card, 404, 'NOT_FOUND', 'Kartu terbit tidak tersedia.');
    await db('content_reports').insert({ id: randomUUID(), card_id: id, issue: input.issue });
    res.status(201).json({ data: { recorded: true } });
  });
  return router;
}
const cardSchema = z
  .object({
    title: text(100).min(1),
    category: z.enum(categories),
    status: z.enum(['draft', 'published', 'archived']),
    revision: z.number().int().min(0),
    verifiedAt: dateOnly.nullable(),
    data: z
      .object({
        summary: text(2000),
        interests: z.array(z.enum(['R', 'I', 'A', 'S', 'E', 'C'])).max(6),
        activities: text(2000),
        subjects: text(1000),
        requirements: text(2000),
        duration: text(500),
        cost: text(1000),
        environment: text(1000),
        reflection: text(500),
        sources: z
          .array(
            z
              .string()
              .url()
              .max(1000)
              .refine((s) => s.startsWith('https://'))
          )
          .max(10),
        officialSourceConfirmed: z.boolean(),
      })
      .strict(),
  })
  .strict();
export function editorialRoutes(db) {
  const router = Router();
  router.use(allow('bk'));
  router.get('/reports', async (req, res) => {
    const result = await paginate(
      db('content_reports as r')
        .join('cards as c', 'c.id', 'r.card_id')
        .where({ 'c.school_id': req.user.school_id, 'r.status': 'open' })
        .select('r.id', 'c.title', 'r.issue', 'r.reported_at')
        .orderBy('r.reported_at', 'desc')
        .orderBy('r.id'),
      pageQuery.parse(req.query).page
    );
    res.json({ data: result });
  });
  router.post('/reports/:id/resolve', async (req, res) => {
    const id = parse(uuid, req.params.id);
    const row = await db('content_reports as r')
      .join('cards as c', 'c.id', 'r.card_id')
      .where({ 'r.id': id, 'c.school_id': req.user.school_id })
      .first();
    fail(row, 404, 'NOT_FOUND', 'Laporan tidak tersedia.');
    await db('content_reports').where({ id }).update({ status: 'resolved' });
    await audit(db, req.user.id, 'content-report.resolved', id);
    res.json({ data: { resolved: true } });
  });
  router.get('/', async (req, res) =>
    res.json({
      data: {
        ...(await paginate(
          db('cards')
            .where({ school_id: req.user.school_id })
            .orderBy('updated_at', 'desc')
            .orderBy('id'),
          pageQuery.parse(req.query).page
        )),
      },
    })
  );
  const save = async (req, res) => {
    const input = parse(cardSchema, req.body);
    if (input.status === 'published')
      fail(
        input.data.sources.length &&
          input.verifiedAt &&
          new Date(input.verifiedAt) <= new Date() &&
          input.data.officialSourceConfirmed &&
          [
            'summary',
            'activities',
            'subjects',
            'requirements',
            'duration',
            'cost',
            'environment',
            'reflection',
          ].every((k) => input.data[k].length > 0),
        422,
        'CONTENT_INCOMPLETE',
        'Lengkapi isi, sumber resmi, konfirmasi pemeriksaan dan tanggal verifikasi sebelum terbit.'
      );
    const id = req.params.id ? parse(uuid, req.params.id) : randomUUID();
    await db.transaction(async (trx) => {
      if (req.params.id) {
        const row = await trx('cards')
          .where({ id, school_id: req.user.school_id })
          .forUpdate()
          .first();
        fail(row, 404, 'NOT_FOUND', 'Kartu tidak tersedia.');
        fail(row.version === input.revision, 409, 'REVISION_CONFLICT', 'Versi kartu berubah.');
      } else fail(input.revision === 0, 409, 'REVISION_CONFLICT', 'Versi awal harus nol.');
      const row = {
        school_id: req.user.school_id,
        author_id: req.user.id,
        title: input.title,
        category: input.category,
        status: input.status,
        version: input.revision + 1,
        data: JSON.stringify(input.data),
        verified_at: input.verifiedAt,
        updated_at: new Date(),
      };
      if (req.params.id) await trx('cards').where({ id }).update(row);
      else await trx('cards').insert({ id, ...row });
      await audit(trx, req.user.id, `card.${input.status}`, id);
    });
    res.json({ data: { id, version: input.revision + 1 } });
  };
  router.post('/', save);
  router.put('/:id', save);
  return router;
}
