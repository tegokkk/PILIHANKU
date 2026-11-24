import { z, text, dateOnly } from '../../middleware/validate.js';
import { categories, questions, instrumentVersion } from '../content/materials.js';
const optionalText = text(500).optional().default('');
// Autosave accepts incomplete drafts while a student edits labels and choices.
// Completeness is shown in the UI; it must not block saving unrelated sections.
const option = z
  .object({
    id: text(100).min(1),
    title: text(100).min(1),
    category: z.enum(categories).optional(),
    version: z.number().int().positive().optional(),
    sourceId: text(100).optional(),
    personal: z.boolean().optional(),
    snapshot: z
      .object({
        summary: text(2000),
        sources: z.array(z.string().url().max(1000)).max(10),
        verified_at: z.string().nullable(),
      })
      .optional(),
    reason: optionalText,
  })
  .strict();
export const explorationSchema = z
  .object({
    revision: z.number().int().min(0),
    instrumentVersion: z.literal(instrumentVersion),
    aggregateConsent: z.boolean(),
    data: z
      .object({
        answers: z
          .record(z.string(), z.number().int().min(1).max(4))
          .refine(
            (a) => Object.keys(a).every((k) => questions.some((q) => q.id === k)),
            'Butir tidak dikenali'
          ),
        context: z
          .object({
            values: z.array(text(100)).max(5),
            reviewed: z.boolean(),
            strengths: optionalText,
            subjects: optionalText,
            support: optionalText,
            barriers: optionalText,
          })
          .strict(),
        comparison: z
          .object({
            options: z
              .array(option)
              .max(3)
              .refine(
                (a) =>
                  new Set(a.map((o) => o.id)).size === a.length &&
                  new Set(a.map((o) => o.title.toLowerCase())).size === a.length,
                'Opsi harus berbeda'
              ),
            criteria: z
              .array(
                z
                  .object({
                    id: text(100).min(1),
                    name: text(100),
                    weight: z.number().int().min(1).max(3).nullable(),
                    ratings: z.record(z.string(), z.number().int().min(1).max(4)),
                  })
                  .strict()
              )
              .min(3)
              .max(5),
          })
          .strict(),
        discussion: z
          .record(z.string(), text(500))
          .refine((d) =>
            Object.keys(d).every((k) =>
              [
                'choice',
                'reason',
                'agreed',
                'different',
                'information',
                'support',
                'next',
                'reflection',
              ].includes(k)
            )
          ),
        plan: z
          .object({
            status: z.enum(['exploring', 'chosen']),
            main: text(100),
            backup: text(100),
            tasks: z
              .array(
                z
                  .object({
                    id: text(100),
                    title: text(200),
                    due: dateOnly.or(z.literal('')),
                    done: z.boolean(),
                  })
                  .strict()
              )
              .max(20),
            support: optionalText,
            barriers: optionalText,
          })
          .strict(),
        simulations: z.record(z.string(), text(500)),
        explored: z.array(z.enum(categories)).max(4),
      })
      .strict(),
  })
  .strict();
