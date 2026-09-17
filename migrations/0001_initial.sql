CREATE TABLE IF NOT EXISTS accounts (
  address TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_requests (
  id TEXT PRIMARY KEY NOT NULL,
  token TEXT UNIQUE NOT NULL,
  memo_id TEXT UNIQUE NOT NULL,
  owner_address TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  title TEXT NOT NULL,
  amount_micro_usdc TEXT NOT NULL,
  created_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY NOT NULL,
  request_id TEXT NOT NULL REFERENCES payment_requests(id),
  transaction_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  payer_address TEXT NOT NULL,
  amount_micro_usdc TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  received_at TEXT NOT NULL,
  UNIQUE(transaction_hash, log_index)
);

CREATE TABLE IF NOT EXISTS sync_state (
  network TEXT PRIMARY KEY NOT NULL,
  last_block INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
