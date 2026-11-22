import { z } from '../middleware/validate.js';
export const pageNumber = z.coerce.number().int().min(1).max(100000).default(1);
export const pageQuery = z.object({ page: pageNumber }).strict();
export async function paginate(query, page, pageSize = 20) {
  const { count } = await query.clone().clearSelect().clearOrder().count({ count: '*' }).first();
  const items = await query.limit(pageSize).offset((page - 1) * pageSize);
  return { items, total: Number(count), page, pageSize };
}
