import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { listRequestsPage, saveRequest } from '$lib/server/store';
import { makeMemoId } from '$core/index';
import { getSession } from '$lib/server/auth';
import { parseUsdcInput } from '$lib/format';
import { consumeRateLimit } from '$lib/server/rate-limit';
import { isSameOrigin, readJson, randomHex } from '$lib/server/request';

const requestSchema = z.object({
  title: z.string().trim().min(1).max(80),
  publicDescription: z.string().trim().min(1).max(160),
  requesterName: z.string().trim().min(2).max(60),
  publicReference: z.string().trim().max(80).optional().default(''),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal('')),
  amount: z.string().regex(/^\d{1,30}(\.\d{1,6})?$/),
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/)
});

export async function GET({ cookies, platform, url }) {
  let session;
  try {
    session = await getSession(
      platform?.env.DB,
      cookies.get('memomatch_session')
    );
  } catch {
    return json(
      { error: 'Authentication storage is temporarily unavailable.' },
      { status: 503 }
    );
  }
  if (!session)
    return json(
      { error: 'Connect a wallet and sign in first.' },
      { status: 401 }
    );
  let withinCreateLimit;
  try {
    withinCreateLimit = await consumeRateLimit(
      platform?.env.DB,
      `create-request:${session.address.toLowerCase()}`,
      5,
      300
    );
  } catch {
    return json(
      { error: 'Request limits are temporarily unavailable.' },
      { status: 503 }
    );
  }
  if (!withinCreateLimit)
    return json(
      { error: 'Too many new requests. Try again in a few minutes.' },
      { status: 429, headers: { 'retry-after': '300' } }
    );
  const requestedLimit = Number(url.searchParams.get('limit') ?? 50);
  const requestedOffset = Number(url.searchParams.get('offset') ?? 0);
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(100, Math.max(1, requestedLimit))
    : 50;
  const offset = Number.isInteger(requestedOffset)
    ? Math.min(1_000_000, Math.max(0, requestedOffset))
    : 0;
  try {
    const page = await listRequestsPage(
      platform?.env.DB,
      session.address,
      limit,
      offset
    );
    return json(
      { ...page, pagination: { limit, offset } },
      { headers: { 'cache-control': 'no-store' } }
    );
  } catch {
    return json(
      { error: 'Request storage is temporarily unavailable.' },
      { status: 503 }
    );
  }
}

export async function POST({ request, cookies, platform, url }) {
  if (!isSameOrigin(request, url.origin))
    return json({ error: 'Origin is not allowed.' }, { status: 403 });
  let session;
  try {
    session = await getSession(
      platform?.env.DB,
      cookies.get('memomatch_session')
    );
  } catch {
    return json(
      { error: 'Authentication storage is temporarily unavailable.' },
      { status: 503 }
    );
  }
  if (!session)
    return json(
      { error: 'Connect a wallet and sign in before creating a request.' },
      { status: 401 }
    );
  const parsed = requestSchema.safeParse(await readJson(request));
  if (!parsed.success)
    return json(
      {
        error:
          'Use a requester name, private label, public payment purpose, positive USDC amount, and valid Arc address.'
      },
      { status: 400 }
    );
  if (parsed.data.recipient.toLowerCase() !== session.address.toLowerCase()) {
    return json(
      { error: 'The recipient must be the signed in wallet.' },
      { status: 403 }
    );
  }
  let amountMicroUsdc: bigint;
  try {
    amountMicroUsdc = parseUsdcInput(parsed.data.amount);
  } catch {
    return json(
      { error: 'Use a positive USDC amount with up to six decimals.' },
      { status: 400 }
    );
  }
  const id = crypto.randomUUID();
  const token = randomHex(32);
  const item = {
    id,
    token,
    memoId: makeMemoId(),
    owner: session.address,
    title: parsed.data.title,
    publicDescription: parsed.data.publicDescription,
    requesterName: parsed.data.requesterName,
    publicReference: parsed.data.publicReference,
    dueDate: parsed.data.dueDate || undefined,
    amount: parsed.data.amount,
    amountMicroUsdc: amountMicroUsdc.toString(),
    paidMicroUsdc: '0',
    remainingMicroUsdc: amountMicroUsdc.toString(),
    overpaidMicroUsdc: '0',
    paid: '0.00',
    recipient: parsed.data.recipient,
    createdAt: new Date().toISOString(),
    payments: []
  };
  let saved;
  try {
    saved = await saveRequest(platform?.env.DB, item);
  } catch {
    return json(
      { error: 'Request storage is temporarily unavailable.' },
      { status: 503 }
    );
  }
  return json(
    { request: saved },
    { status: 201, headers: { 'cache-control': 'no-store' } }
  );
}
