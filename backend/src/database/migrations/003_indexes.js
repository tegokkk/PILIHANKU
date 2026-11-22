export async function up(db) {
  await db.raw(
    `CREATE INDEX registrations_review_idx ON student_registrations(school_id,status,submitted_at DESC); CREATE INDEX consultations_inbox_idx ON consultations(teacher_id,status,created_at DESC); CREATE INDEX consultations_sender_idx ON consultations(sender_id,created_at DESC); CREATE INDEX profiles_class_idx ON student_profiles(class_id); CREATE INDEX cards_catalog_idx ON cards(school_id,status,title);`
  );
}
export async function down(db) {
  await db.raw(
    'DROP INDEX registrations_review_idx,consultations_inbox_idx,consultations_sender_idx,profiles_class_idx,cards_catalog_idx'
  );
}
