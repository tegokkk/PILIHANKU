import { createHash } from 'node:crypto';
export const subjectHash = (id) =>
  createHash('sha256').update(`pilihanku-deletion:${id}`).digest('hex');
export async function deleteConsultation(db, id, reason = 'self') {
  return db.transaction(async (trx) => {
    await trx('deletion_ledger')
      .insert({ subject_hash: subjectHash(`consultation:${id}`), reason })
      .onConflict('subject_hash')
      .ignore();
    await trx('audit_events').where({ target_id: id }).update({ target_id: null });
    await trx('consultations').where({ id }).del();
  });
}
export async function deleteUserData(db, id, reason) {
  return db.transaction(async (trx) => {
    const user = await trx('users').where({ id, role: 'siswa' }).forUpdate().first();
    if (!user) return false;
    await trx('deletion_ledger')
      .insert({ subject_hash: subjectHash(id), reason })
      .onConflict('subject_hash')
      .ignore();
    await trx('sessions').whereRaw("sess->>'userId' = ?", [id]).del();
    await trx('audit_events').where({ target_id: id }).update({ target_id: null });
    const registrations = await trx('student_registrations').where({ user_id: id }).select('id');
    if (registrations.length)
      await trx('audit_events')
        .whereIn(
          'target_id',
          registrations.map((r) => r.id)
        )
        .update({ target_id: null });
    const consultations = await trx('consultations').where({ sender_id: id }).select('id');
    if (consultations.length)
      await trx('audit_events')
        .whereIn(
          'target_id',
          consultations.map((r) => r.id)
        )
        .update({ target_id: null });
    await trx('users').where({ id }).del();
    return true;
  });
}
