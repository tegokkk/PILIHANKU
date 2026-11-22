export async function up(db) {
  await db.schema.alterTable('exploration', (t) => {
    t.timestamp('aggregate_consent_at', { useTz: true });
    t.text('aggregate_consent_version');
  });
}
export async function down(db) {
  await db.schema.alterTable('exploration', (t) => {
    t.dropColumn('aggregate_consent_at');
    t.dropColumn('aggregate_consent_version');
  });
}
