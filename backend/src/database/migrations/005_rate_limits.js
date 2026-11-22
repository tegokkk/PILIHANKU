export async function up(db) {
  await db.raw(`CREATE TABLE rate_limit_buckets (
    key_hash text PRIMARY KEY, hits integer NOT NULL CHECK(hits > 0), reset_at timestamptz NOT NULL
  ); CREATE INDEX rate_limit_expiry_idx ON rate_limit_buckets(reset_at);`);
}
export async function down(db) {
  await db.schema.dropTable('rate_limit_buckets');
}
