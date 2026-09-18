import type { D1Database } from '@cloudflare/workers-types';
import { dev } from '$app/environment';
import { formatUsdcBaseUnits, parseUsdc } from '$lib/format';
import type { Payment, PaymentRequest } from '$lib/types';
import { ARC_EXPLORER_URL } from '$lib/config';

type StoreDatabase = D1Database | undefined;
type RequestRow = {
  id: string;
  token: string;
  memo_id: string;
  owner_address: string;
  recipient_address: string;
  title: string;
  public_description: string | null;
  requester_name: string | null;
  public_reference: string | null;
  due_date: string | null;
  amount_micro_usdc: string;
  created_at: string;
  closed_at: string | null;
};
type PaymentRow = {
  id: string;
  request_id: string;
  transaction_hash: string;
  log_index: number;
  payer_address: string;
  amount_micro_usdc: string;
  block_number: number;
  block_timestamp: string | null;
  received_at: string;
};

const memoryRequests = new Map<string, PaymentRequest>();

function requireDatabase(db: StoreDatabase) {
  if (!db && !dev) throw new Error('Database unavailable');
}

function canonicalAmount(request: PaymentRequest) {
  return request.amountMicroUsdc ?? parseUsdc(request.amount).toString();
}

function canonicalPaid(request: PaymentRequest) {
  return request.paidMicroUsdc ?? parseUsdc(request.paid).toString();
}

function withDerivedAmounts(
  request: PaymentRequest,
  paid = canonicalPaid(request)
): PaymentRequest {
  const amountMicroUsdc = canonicalAmount(request);
  const amount = BigInt(amountMicroUsdc);
  const paidAmount = BigInt(paid);
  const remaining = amount > paidAmount ? amount - paidAmount : 0n;
  const overpaid = paidAmount > amount ? paidAmount - amount : 0n;
  return {
    ...request,
    amountMicroUsdc,
    paidMicroUsdc: paidAmount.toString(),
    remainingMicroUsdc: remaining.toString(),
    overpaidMicroUsdc: overpaid.toString(),
    amount: formatUsdcBaseUnits(amountMicroUsdc),
    paid: formatUsdcBaseUnits(paidAmount)
  };
}

function listMemory(owner?: string) {
  return [...memoryRequests.values()]
    .filter(
      (request) =>
        !owner || request.owner?.toLowerCase() === owner.toLowerCase()
    )
    .map((request) => withDerivedAmounts(request))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function paymentFromRow(row: PaymentRow): Payment {
  return {
    id: row.id,
    amountMicroUsdc: row.amount_micro_usdc,
    amount: formatUsdcBaseUnits(row.amount_micro_usdc),
    payer: row.payer_address,
    transactionHash: row.transaction_hash,
    logIndex: row.log_index,
    blockNumber: row.block_number,
    receivedAt: row.block_timestamp ?? row.received_at,
    explorerUrl: `${ARC_EXPLORER_URL}/tx/${row.transaction_hash}`,
    verification: 'verified'
  };
}

async function requestFromRow(
  db: D1Database,
  row: RequestRow
): Promise<PaymentRequest> {
  const payments = await db
    .prepare(
      'SELECT * FROM payments WHERE request_id = ? ORDER BY block_number ASC, log_index ASC'
    )
    .bind(row.id)
    .all<PaymentRow>();
  const paymentItems = payments.results.map(paymentFromRow);
  const paid = paymentItems.reduce(
    (sum, payment) =>
      sum +
      BigInt(payment.amountMicroUsdc ?? parseUsdc(payment.amount).toString()),
    0n
  );
  return withDerivedAmounts(
    {
      id: row.id,
      token: row.token,
      memoId: row.memo_id,
      owner: row.owner_address,
      title: row.title,
      publicDescription: row.public_description ?? '',
      requesterName: row.requester_name ?? '',
      publicReference: row.public_reference ?? '',
      dueDate: row.due_date || undefined,
      amount: formatUsdcBaseUnits(row.amount_micro_usdc),
      paid: formatUsdcBaseUnits(paid),
      recipient: row.recipient_address,
      createdAt: row.created_at,
      closedAt: row.closed_at ?? undefined,
      payments: paymentItems
    },
    paid.toString()
  );
}

export async function listRequests(db: StoreDatabase, owner: string) {
  if (!db) {
    requireDatabase(db);
    return listMemory(owner);
  }
  const result = await db
    .prepare(
      'SELECT * FROM payment_requests WHERE owner_address = ? ORDER BY created_at DESC'
    )
    .bind(owner.toLowerCase())
    .all<RequestRow>();
  return Promise.all(result.results.map((row) => requestFromRow(db, row)));
}

export async function listRequestsPage(
  db: StoreDatabase,
  owner: string,
  limit: number,
  offset: number
) {
  if (!db) {
    requireDatabase(db);
    const items = listMemory(owner).slice(offset, offset + limit + 1);
    return {
      requests: items.slice(0, limit),
      hasMore: items.length > limit
    };
  }
  const result = await db
    .prepare(
      'SELECT * FROM payment_requests WHERE owner_address = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    )
    .bind(owner.toLowerCase(), limit + 1, offset)
    .all<RequestRow>();
  const items = await Promise.all(
    result.results.map((row) => requestFromRow(db, row))
  );
  return {
    requests: items.slice(0, limit),
    hasMore: items.length > limit
  };
}

export async function getRequest(
  db: StoreDatabase,
  id: string,
  owner?: string
) {
  if (!db) {
    requireDatabase(db);
    const request = memoryRequests.get(id);
    if (owner && request?.owner?.toLowerCase() !== owner.toLowerCase())
      return undefined;
    return request ? withDerivedAmounts(request) : undefined;
  }
  const row = await db
    .prepare(
      'SELECT * FROM payment_requests WHERE id = ? AND (? IS NULL OR owner_address = ?)'
    )
    .bind(id, owner?.toLowerCase() ?? null, owner?.toLowerCase() ?? null)
    .first<RequestRow>();
  return row ? requestFromRow(db, row) : undefined;
}

export async function getRequestByToken(db: StoreDatabase, token: string) {
  if (!db) {
    requireDatabase(db);
    return dev
      ? [...memoryRequests.values()].find((request) => request.token === token)
      : undefined;
  }
  const row = await db
    .prepare('SELECT * FROM payment_requests WHERE token = ?')
    .bind(token)
    .first<RequestRow>();
  return row ? requestFromRow(db, row) : undefined;
}

export async function saveRequest(db: StoreDatabase, request: PaymentRequest) {
  const normalizedOwner =
    request.owner?.toLowerCase() ?? request.recipient.toLowerCase();
  const item = withDerivedAmounts({ ...request, owner: normalizedOwner }, '0');
  const amountMicroUsdc = canonicalAmount(item);
  if (BigInt(amountMicroUsdc) <= 0n) throw new Error('Amount must be positive');
  if (!db) {
    requireDatabase(db);
    memoryRequests.set(item.id, item);
    return item;
  }
  await db
    .prepare(
      'INSERT OR IGNORE INTO accounts(address, created_at) VALUES (?, ?)'
    )
    .bind(normalizedOwner, item.createdAt)
    .run();
  await db
    .prepare(
      `INSERT INTO payment_requests
    (id, token, memo_id, owner_address, recipient_address, title, public_description, requester_name, public_reference, due_date, amount_micro_usdc, created_at, closed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      item.id,
      item.token,
      item.memoId,
      normalizedOwner,
      item.recipient,
      item.title,
      item.publicDescription ?? '',
      item.requesterName ?? '',
      item.publicReference ?? '',
      item.dueDate ?? null,
      amountMicroUsdc,
      item.createdAt,
      item.closedAt ?? null
    )
    .run();
  return item;
}

export async function updateRequest(
  db: StoreDatabase,
  id: string,
  owner: string,
  update: Partial<PaymentRequest>
) {
  if (!db) {
    requireDatabase(db);
    const current = memoryRequests.get(id);
    if (!current || current.owner?.toLowerCase() !== owner.toLowerCase())
      return undefined;
    const next = withDerivedAmounts({ ...current, ...update });
    memoryRequests.set(id, next);
    return next;
  }
  if (
    update.title !== undefined ||
    update.publicDescription !== undefined ||
    update.requesterName !== undefined ||
    update.publicReference !== undefined ||
    update.dueDate !== undefined ||
    update.closedAt !== undefined
  ) {
    await db
      .prepare(
        'UPDATE payment_requests SET title = COALESCE(?, title), public_description = COALESCE(?, public_description), requester_name = COALESCE(?, requester_name), public_reference = COALESCE(?, public_reference), due_date = CASE WHEN ? = 1 THEN ? ELSE due_date END, closed_at = COALESCE(?, closed_at) WHERE id = ? AND owner_address = ?'
      )
      .bind(
        update.title ?? null,
        update.publicDescription ?? null,
        update.requesterName ?? null,
        update.publicReference ?? null,
        update.dueDate !== undefined ? 1 : 0,
        update.dueDate || null,
        update.closedAt ?? null,
        id,
        owner.toLowerCase()
      )
      .run();
  }
  return getRequest(db, id, owner);
}

export async function recordPayment(
  db: StoreDatabase,
  requestId: string,
  payment: Payment
) {
  const normalizedPayment = {
    ...payment,
    transactionHash: payment.transactionHash.toLowerCase()
  };
  const amountMicroUsdc =
    normalizedPayment.amountMicroUsdc ??
    parseUsdc(normalizedPayment.amount).toString();
  if (!db) {
    requireDatabase(db);
    const current = memoryRequests.get(requestId);
    if (!current) return undefined;
    const duplicate = current.payments.some(
      (item) =>
        item.transactionHash.toLowerCase() ===
          normalizedPayment.transactionHash &&
        item.logIndex === normalizedPayment.logIndex
    );
    if (!duplicate) {
      current.payments = [
        ...current.payments,
        {
          ...normalizedPayment,
          amountMicroUsdc,
          amount: formatUsdcBaseUnits(amountMicroUsdc)
        }
      ];
      memoryRequests.set(
        requestId,
        withDerivedAmounts(
          current,
          current.payments
            .reduce(
              (sum, item) =>
                sum +
                BigInt(
                  item.amountMicroUsdc ?? parseUsdc(item.amount).toString()
                ),
              0n
            )
            .toString()
        )
      );
    }
    return withDerivedAmounts(current);
  }
  try {
    await db
      .prepare(
        `INSERT INTO payments
      (id, request_id, transaction_hash, log_index, payer_address, amount_micro_usdc, block_number, block_timestamp, received_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        normalizedPayment.id,
        requestId,
        normalizedPayment.transactionHash,
        normalizedPayment.logIndex ?? 0,
        normalizedPayment.payer,
        amountMicroUsdc,
        normalizedPayment.blockNumber,
        normalizedPayment.receivedAt,
        new Date().toISOString()
      )
      .run();
  } catch (error) {
    if (!String(error).toLowerCase().includes('unique')) throw error;
    const existing = await db
      .prepare(
        'SELECT id FROM payments WHERE transaction_hash = ? AND log_index = ?'
      )
      .bind(normalizedPayment.transactionHash, normalizedPayment.logIndex ?? 0)
      .first<{ id: string }>();
    if (!existing) throw error;
  }
  return getRequest(db, requestId);
}
