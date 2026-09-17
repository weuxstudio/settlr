CREATE TABLE IF NOT EXISTS auth_challenges (
  nonce TEXT PRIMARY KEY NOT NULL,
  address TEXT NOT NULL,
  message TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  address TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_attempts (
  request_id TEXT NOT NULL REFERENCES payment_requests(id),
  network TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'delayed', 'verified', 'rejected')),
  reason TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (network, transaction_hash)
);

ALTER TABLE payments ADD COLUMN block_timestamp TEXT;

CREATE TABLE IF NOT EXISTS worker_locks (
  name TEXT PRIMARY KEY NOT NULL,
  owner TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (bucket, window_start)
);

CREATE INDEX IF NOT EXISTS auth_challenges_expiry ON auth_challenges(expires_at);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS verification_attempts_due ON verification_attempts(state, next_attempt_at);
