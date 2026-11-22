import { z } from 'zod';
export { z };
export const text = (max = 500) => z.string().trim().max(max);
export const uuid = z.string().uuid();
export const password = z.string().min(12).max(128);
export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Tanggal tidak valid');
export const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.-]{3,30}$/);
export const parse = (schema, value) => schema.parse(value);
