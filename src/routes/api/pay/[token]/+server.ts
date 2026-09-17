import { json } from '@sveltejs/kit';
import { getRequestByToken } from '$lib/server/store';
import { publicPayment } from '$lib/server/public';
import {
  ARC_CHAIN_ID,
  ARC_ENVIRONMENT,
  ARC_EXPLORER_URL,
  ARC_MEMO_ADDRESS,
  ARC_RPC_URL,
  ARC_USDC_ADDRESS
} from '$lib/config';

export async function GET({ params, platform }) {
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
  return json(
    {
      request: {
        ...publicPayment(item),
        network: ARC_ENVIRONMENT,
        chainId: ARC_CHAIN_ID,
        explorerUrl: ARC_EXPLORER_URL,
        rpcUrl: ARC_RPC_URL,
        usdcAddress: ARC_USDC_ADDRESS,
        memoAddress: ARC_MEMO_ADDRESS,
        paymentsEnabled: platform?.env.PAYMENTS_ENABLED === 'true'
      }
    },
    { headers: { 'cache-control': 'no-store' } }
  );
}
