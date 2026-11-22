import { createHmac } from 'node:crypto';

// Atomic fixed windows shared by every server process; never store raw IP/username.
export class PostgresRateLimitStore {
  constructor(db, prefix, secret) {
    this.db = db;
    this.prefix = prefix;
    this.secret = secret;
    this.localKeys = false;
  }
  init({ windowMs }) {
    this.windowMs = windowMs;
  }
  hash(key) {
    return createHmac('sha256', this.secret).update(`${this.prefix}:${key}`).digest('hex');
  }
  async increment(key) {
    const result = await this.db.raw(
      `INSERT INTO rate_limit_buckets (key_hash,hits,reset_at)
      VALUES (?,1,clock_timestamp() + ? * interval '1 millisecond')
      ON CONFLICT (key_hash) DO UPDATE SET
        hits = CASE WHEN rate_limit_buckets.reset_at <= clock_timestamp() THEN 1 ELSE rate_limit_buckets.hits + 1 END,
        reset_at = CASE WHEN rate_limit_buckets.reset_at <= clock_timestamp()
          THEN clock_timestamp() + ? * interval '1 millisecond' ELSE rate_limit_buckets.reset_at END
      RETURNING hits,reset_at`,
      [this.hash(key), this.windowMs, this.windowMs]
    );
    return { totalHits: result.rows[0].hits, resetTime: new Date(result.rows[0].reset_at) };
  }
  async decrement(key) {
    // Kept for Store compatibility; this app counts successful and failed attempts.
    await this.db('rate_limit_buckets')
      .where({ key_hash: this.hash(key) })
      .where('hits', '>', 1)
      .decrement('hits', 1);
  }
  async resetKey(key) {
    await this.db('rate_limit_buckets')
      .where({ key_hash: this.hash(key) })
      .del();
  }
}
