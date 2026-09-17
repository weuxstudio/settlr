import {
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex
} from 'drizzle-orm/sqlite-core';

export const accounts = sqliteTable('accounts', {
  address: text('address').primaryKey(),
  createdAt: text('created_at').notNull()
});

export const paymentRequests = sqliteTable(
  'payment_requests',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull(),
    memoId: text('memo_id').notNull(),
    ownerAddress: text('owner_address').notNull(),
    recipientAddress: text('recipient_address').notNull(),
    title: text('title').notNull(),
    amountMicroUsdc: text('amount_micro_usdc').notNull(),
    createdAt: text('created_at').notNull(),
    closedAt: text('closed_at')
  },
  (table) => ({
    tokenUnique: uniqueIndex('payment_requests_token_unique').on(table.token),
    memoUnique: uniqueIndex('payment_requests_memo_unique').on(table.memoId)
  })
);

export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    requestId: text('request_id').notNull(),
    transactionHash: text('transaction_hash').notNull(),
    logIndex: integer('log_index').notNull(),
    payerAddress: text('payer_address').notNull(),
    amountMicroUsdc: text('amount_micro_usdc').notNull(),
    blockNumber: integer('block_number').notNull(),
    blockTimestamp: text('block_timestamp'),
    receivedAt: text('received_at').notNull()
  },
  (table) => ({
    transferUnique: uniqueIndex('payments_transaction_log_unique').on(
      table.transactionHash,
      table.logIndex
    )
  })
);

export const syncState = sqliteTable('sync_state', {
  network: text('network').primaryKey(),
  lastBlock: integer('last_block').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const authChallenges = sqliteTable('auth_challenges', {
  nonce: text('nonce').primaryKey(),
  address: text('address').notNull(),
  message: text('message').notNull(),
  expiresAt: integer('expires_at').notNull(),
  consumedAt: integer('consumed_at')
});

export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  address: text('address').notNull(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull()
});

export const verificationAttempts = sqliteTable(
  'verification_attempts',
  {
    requestId: text('request_id').notNull(),
    network: text('network').notNull(),
    transactionHash: text('transaction_hash').notNull(),
    state: text('state').notNull(),
    reason: text('reason'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: integer('next_attempt_at').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => ({
    identity: primaryKey({ columns: [table.network, table.transactionHash] })
  })
);

export const workerLocks = sqliteTable('worker_locks', {
  name: text('name').primaryKey(),
  owner: text('owner').notNull(),
  expiresAt: integer('expires_at').notNull()
});

export const rateLimits = sqliteTable(
  'rate_limits',
  {
    bucket: text('bucket').notNull(),
    windowStart: integer('window_start').notNull(),
    count: integer('count').notNull()
  },
  (table) => ({
    identity: primaryKey({ columns: [table.bucket, table.windowStart] })
  })
);
