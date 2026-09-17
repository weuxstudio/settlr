import { json } from '@sveltejs/kit';
import { getRequestByToken } from '$lib/server/store';
import { publicPayment } from '$lib/server/public';
import { ARC_CHAIN_ID, ARC_ENVIRONMENT, ARC_EXPLORER_URL } from '$lib/config';

export async function GET({ params, platform }) {
  let item;
  try {
    item = await getRequestByToken(platform?.env.DB, params.token);
  } catch {
    return json(
      { error: 'Receipt service is temporarily unavailable.' },
      { status: 503 }
    );
  }
  if (!item) return json({ error: 'Receipt not found.' }, { status: 404 });
  return json(
    {
      request: {
        ...publicPayment(item),
        network: ARC_ENVIRONMENT,
        chainId: ARC_CHAIN_ID,
        explorerUrl: ARC_EXPLORER_URL
      }
    },
    { headers: { 'cache-control': 'no-store' } }
  );
}
