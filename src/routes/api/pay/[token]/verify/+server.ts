import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { createPublicClient, getAddress, http } from 'viem';
import { getRequestByToken, recordPayment } from '$lib/server/store';
import {
  ARC_CHAIN,
  ARC_ENVIRONMENT,
  ARC_RPC_URL,
  explorerTransaction
} from '$lib/config';
import { formatUsdcBaseUnits } from '$lib/format';
import { verifyReceipt } from '$core/index';
import { publicPayment } from '$lib/server/public';
import { isSameOrigin, readJson } from '$lib/server/request';
import {
  claimAttempt,
  getAttempt,
  saveAttempt
} from '$lib/server/verification';
import { consumeRateLimit } from '$lib/server/rate-limit';

const bodySchema = z.object({
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/)
});

export async function POST({ params, request, platform, url }) {
  if (!isSameOrigin(request, url.origin))
    return json({ error: 'Origin is not allowed.' }, { status: 403 });
  if (platform?.env.PAYMENTS_ENABLED !== 'true')
    return json(
      {
        status: 'disabled',
        message: 'Payment verification is disabled in this environment.'
      },
      { status: 503 }
    );
  const clientKey = request.headers.get('cf-connecting-ip') ?? 'unknown';
  let withinIpLimit;
  let withinLinkLimit;
  try {
    withinIpLimit = await consumeRateLimit(
      platform?.env.DB,
      `verify-ip:${clientKey}`,
      30,
      60
    );
    withinLinkLimit = await consumeRateLimit(
      platform?.env.DB,
      `verify:${clientKey}:${params.token}`,
      10,
      60
    );
  } catch {
    return json(
      { error: 'Request limits are temporarily unavailable.' },
      { status: 503 }
    );
  }
  if (!withinIpLimit || !withinLinkLimit)
    return json(
      { error: 'Too many verification attempts. Try again shortly.' },
      { status: 429, headers: { 'retry-after': '60' } }
    );
  let item;
  try {
    item = await getRequestByToken(platform?.env.DB, params.token);
  } catch {
    return json(
      { error: 'Payment service is temporarily unavailable.' },
      { status: 503 }
    );
  }
  if (!item) return json({ error: 'Payment link not found.' }, { status: 404 });
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success)
    return json(
      { error: 'Enter a valid Arc transaction hash.' },
      { status: 400 }
    );

  let previousAttempt;
  try {
    previousAttempt = await getAttempt(
      platform?.env.DB,
      ARC_ENVIRONMENT,
      parsed.data.transactionHash
    );
  } catch {
    return json(
      { error: 'Payment service is temporarily unavailable.' },
      { status: 503 }
    );
  }
  if (
    previousAttempt &&
    previousAttempt.request_id === item.id &&
    Date.now() - new Date(previousAttempt.updated_at).getTime() < 10_000
  ) {
    if (previousAttempt.state === 'verified')
      return json(
        {
          status: 'verified',
          transactionHash: parsed.data.transactionHash,
          request: publicPayment(item)
        },
        { headers: { 'cache-control': 'no-store' } }
      );
    if (previousAttempt.state === 'rejected')
      return json(
        {
          status: 'rejected',
          transactionHash: parsed.data.transactionHash,
          message:
            'The transaction could not be matched to this payment request.'
        },
        { status: 422 }
      );
    return json(
      {
        status: previousAttempt.state,
        transactionHash: parsed.data.transactionHash,
        message: 'Arc has not committed this transaction yet.'
      },
      { status: 202, headers: { 'cache-control': 'no-store' } }
    );
  }

  let claimed;
  try {
    claimed = await claimAttempt(
      platform?.env.DB,
      item.id,
      ARC_ENVIRONMENT,
      parsed.data.transactionHash
    );
  } catch {
    return json(
      { error: 'Payment service is temporarily unavailable.' },
      { status: 503 }
    );
  }
  if (!claimed)
    return json(
      {
        status: 'pending',
        transactionHash: parsed.data.transactionHash,
        message: 'This transaction is already being checked.'
      },
      { status: 202, headers: { 'cache-control': 'no-store' } }
    );

  const client = createPublicClient({
    chain: ARC_CHAIN,
    transport: http(ARC_RPC_URL)
  });
  let receipt;
  let transaction;
  let chainId: number;
  let senderCode;
  let block;
  try {
    [receipt, transaction, chainId] = await Promise.all([
      client.getTransactionReceipt({
        hash: parsed.data.transactionHash as `0x${string}`
      }),
      client.getTransaction({
        hash: parsed.data.transactionHash as `0x${string}`
      }),
      client.getChainId()
    ]);
    senderCode =
      (await client.getBytecode({ address: transaction.from })) ?? '0x';
    block = await client.getBlock({ blockNumber: receipt.blockNumber ?? 0n });
  } catch {
    await saveAttempt(
      platform?.env.DB,
      item.id,
      ARC_ENVIRONMENT,
      parsed.data.transactionHash,
      'delayed',
      'Transaction not committed yet'
    );
    return json(
      {
        status: 'delayed',
        transactionHash: parsed.data.transactionHash,
        message: 'Arc has not committed this transaction yet.'
      },
      { status: 202, headers: { 'cache-control': 'no-store' } }
    );
  }

  const result = verifyReceipt(
    receipt,
    {
      memoId: item.memoId as `0x${string}`,
      recipient: getAddress(item.recipient),
      amount: BigInt(item.amountMicroUsdc ?? '0')
    },
    chainId,
    {
      hash: transaction.hash,
      from: transaction.from,
      fromCode: senderCode,
      to: transaction.to ?? undefined,
      input: transaction.input
    }
  );
  if (!result.ok) {
    await saveAttempt(
      platform?.env.DB,
      item.id,
      ARC_ENVIRONMENT,
      parsed.data.transactionHash,
      'rejected',
      result.reason
    );
    return json(
      {
        status: 'rejected',
        transactionHash: parsed.data.transactionHash,
        message: 'The transaction could not be matched to this payment request.'
      },
      { status: 422 }
    );
  }

  const amountMicroUsdc =
    result.transfer.decimals === 18
      ? result.transfer.value / 1_000_000_000_000n
      : result.transfer.value;
  const payment = {
    id: `${ARC_ENVIRONMENT}:${parsed.data.transactionHash.toLowerCase()}:${result.transfer.logIndex}`,
    amountMicroUsdc: amountMicroUsdc.toString(),
    amount: formatUsdcBaseUnits(amountMicroUsdc),
    payer: result.transfer.from,
    transactionHash: parsed.data.transactionHash,
    logIndex: result.transfer.logIndex,
    blockNumber: Number(receipt.blockNumber ?? 0n),
    receivedAt: new Date(Number(block.timestamp) * 1000).toISOString(),
    explorerUrl: explorerTransaction(parsed.data.transactionHash),
    verification: 'verified' as const
  };
  const updated = await recordPayment(platform?.env.DB, item.id, payment);
  await saveAttempt(
    platform?.env.DB,
    item.id,
    ARC_ENVIRONMENT,
    parsed.data.transactionHash,
    'verified'
  );
  return json(
    {
      status: 'verified',
      transactionHash: parsed.data.transactionHash,
      request: updated ? publicPayment(updated) : publicPayment(item)
    },
    { headers: { 'cache-control': 'no-store' } }
  );
}
