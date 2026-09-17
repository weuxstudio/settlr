import type { D1Database } from '@cloudflare/workers-types';

export type VerificationState = 'pending' | 'delayed' | 'verified' | 'rejected';

export async function claimAttempt(
  db: D1Database | undefined,
  requestId: string,
  network: string,
  transactionHash: string
) {
  if (!db) return true;
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `INSERT INTO verification_attempts(request_id, network, transaction_hash, state, reason, attempts, next_attempt_at, created_at, updated_at)
    VALUES (?, ?, ?, 'pending', NULL, 1, ?, ?, ?)
    ON CONFLICT(network, transaction_hash) DO UPDATE SET state = 'pending', reason = NULL, attempts = verification_attempts.attempts + 1, next_attempt_at = excluded.next_attempt_at, updated_at = excluded.updated_at
    WHERE verification_attempts.request_id = ? AND verification_attempts.updated_at < ?`
    )
    .bind(
      requestId,
      network,
      transactionHash.toLowerCase(),
      Date.now() + 10_000,
      now,
      now,
      requestId,
      new Date(Date.now() - 10_000).toISOString()
    )
    .run();
  return (result.meta?.changes ?? 0) === 1;
}

export async function saveAttempt(
  db: D1Database | undefined,
  requestId: string,
  network: string,
  transactionHash: string,
  state: VerificationState,
  reason?: string
) {
  if (!db) return;
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO verification_attempts(request_id, network, transaction_hash, state, reason, attempts, next_attempt_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
    ON CONFLICT(network, transaction_hash) DO UPDATE SET state = excluded.state, reason = excluded.reason, attempts = verification_attempts.attempts + 1, next_attempt_at = excluded.next_attempt_at, updated_at = excluded.updated_at`
    )
    .bind(
      requestId,
      network,
      transactionHash.toLowerCase(),
      state,
      reason ?? null,
      Date.now(),
      now,
      now
    )
    .run();
}

export async function getAttempt(
  db: D1Database | undefined,
  network: string,
  transactionHash: string
) {
  if (!db) return undefined;
  return db
    .prepare(
      'SELECT request_id, state, reason, attempts, next_attempt_at, updated_at FROM verification_attempts WHERE network = ? AND transaction_hash = ?'
    )
    .bind(network, transactionHash.toLowerCase())
    .first<{
      request_id: string;
      state: VerificationState;
      reason: string | null;
      attempts: number;
      next_attempt_at: number;
      updated_at: string;
    }>();
}
