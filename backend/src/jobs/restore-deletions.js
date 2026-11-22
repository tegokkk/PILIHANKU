import { z } from '../middleware/validate.js';
import { subjectHash, deleteUserData, deleteConsultation } from './deletion.js';
const ledgerSchema = z.array(
  z
    .object({
      subject_hash: z.string().regex(/^[a-f0-9]{64}$/),
      deleted_at: z.coerce.date(),
      reason: z.string().min(1).max(200),
    })
    .strict()
);

export function parseDeletionLedger(input) {
  return ledgerSchema.parse(input);
}

export async function reapplyDeletions(db, input) {
  const ledger = parseDeletionLedger(input);
  // Preserve absent subjects too, so the next export cannot forget their erasure.
  for (let i = 0; i < ledger.length; i += 500)
    await db('deletion_ledger')
      .insert(ledger.slice(i, i + 500))
      .onConflict('subject_hash')
      .ignore();
  const hashes = new Set(ledger.map((r) => r.subject_hash));
  let count = 0;
  for (const user of await db('users').where({ role: 'siswa' }).select('id'))
    if (hashes.has(subjectHash(user.id))) {
      await deleteUserData(db, user.id, 'restore-reapply');
      count++;
    }
  for (const row of await db('consultations').select('id'))
    if (hashes.has(subjectHash(`consultation:${row.id}`))) {
      await deleteConsultation(db, row.id, 'restore-reapply');
      count++;
    }
  return count;
}
