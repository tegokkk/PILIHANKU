export async function up(db) {
  await db.raw(
    "CREATE TABLE content_reports(id uuid PRIMARY KEY,card_id uuid NOT NULL REFERENCES cards ON DELETE CASCADE,issue text NOT NULL CHECK(issue IN ('unavailable','outdated')),status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),reported_at timestamptz NOT NULL DEFAULT now()); CREATE INDEX content_reports_card ON content_reports(card_id,status);"
  );
}
export async function down(db) {
  await db.schema.dropTable('content_reports');
}
