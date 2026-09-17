import type { D1Database } from '@cloudflare/workers-types';
import { dev } from '$app/environment';

async function hash(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest), (item) =>
    item.toString(16).padStart(2, '0')
  ).join('');
}

export async function consumeRateLimit(
  db: D1Database | undefined,
  key: string,
  limit: number,
  windowSeconds: number
) {
  if (!db) return dev;
  const windowStart =
    Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds;
  const bucket = await hash(key);
  const result = await db
    .prepare(
      `INSERT INTO rate_limits(bucket, window_start, count) VALUES (?, ?, 1)
    ON CONFLICT(bucket, window_start) DO UPDATE SET count = count + 1 WHERE count < ?`
    )
    .bind(bucket, windowStart, limit)
    .run();
  return (result.meta?.changes ?? 0) === 1;
}

export async function cleanupRateLimits(db: D1Database | undefined) {
  if (db)
    await db
      .prepare('DELETE FROM rate_limits WHERE window_start < ?')
      .bind(Math.floor(Date.now() / 1000) - 3600)
      .run();
}
