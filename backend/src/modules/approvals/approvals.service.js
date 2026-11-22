import { randomUUID } from 'node:crypto';
import { fail } from '../../utils/api-error.js';
import { audit } from '../audit/audit.js';
export async function decide(db, actor, id, decision, reason) {
  return db.transaction(async (trx) => {
    const row = await trx('student_registrations')
      .where({ id, school_id: actor.school_id })
      .forUpdate()
      .first();
    fail(row, 404, 'NOT_FOUND', 'Pengajuan tidak tersedia.');
    if (row.status === decision) return { id, status: row.status, replayed: true };
    fail(
      row.status === 'pending',
      409,
      'DECISION_CONFLICT',
      'Pengajuan sudah diputuskan. Muat data terbaru.'
    );
    const cls = await trx('classes')
      .where({ id: row.requested_class_id, school_id: actor.school_id })
      .forShare()
      .first();
    fail(
      decision !== 'approved' || (cls?.active && new Date(cls.retention_end_at) > new Date()),
      409,
      'CLASS_INACTIVE',
      'Kelas tidak aktif. Perbarui konteks kelas sebelum persetujuan.'
    );
    await trx('users')
      .where({ id: row.user_id, status: 'pending' })
      .update({ status: decision, session_version: trx.raw('session_version + 1') });
    await trx('student_registrations')
      .where({ id })
      .update({
        status: decision,
        reviewed_by: actor.id,
        reviewed_at: new Date(),
        rejection_reason: decision === 'rejected' ? reason : null,
        revision: trx.raw('revision + 1'),
      });
    if (decision === 'approved')
      await trx('student_profiles').insert({
        user_id: row.user_id,
        school_id: actor.school_id,
        class_id: cls.id,
        participant_id: randomUUID(),
      });
    await audit(trx, actor.id, `registration.${decision}`, id);
    return { id, status: decision };
  });
}
