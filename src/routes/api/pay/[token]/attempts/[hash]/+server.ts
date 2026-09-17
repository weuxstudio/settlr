import { json } from '@sveltejs/kit';
import { getRequestByToken } from '$lib/server/store';
import { getAttempt } from '$lib/server/verification';
import { ARC_ENVIRONMENT } from '$lib/config';

export async function GET({ params, platform }) {
  let request;
  try {
    request = await getRequestByToken(platform?.env.DB, params.token);
  } catch {
    return json(
      { error: 'Payment service is temporarily unavailable.' },
      { status: 503 }
    );
  }
  if (!request)
    return json({ error: 'Payment link not found.' }, { status: 404 });
  const hash = params.hash?.toLowerCase() ?? '';
  if (!/^0x[a-f0-9]{64}$/.test(hash))
    return json({ error: 'Invalid transaction hash.' }, { status: 400 });
  let attempt;
  try {
    attempt = await getAttempt(platform?.env.DB, ARC_ENVIRONMENT, hash);
  } catch {
    return json(
      { error: 'Payment service is temporarily unavailable.' },
      { status: 503 }
    );
  }
  if (!attempt || attempt.request_id !== request.id)
    return json(
      { status: 'pending', transactionHash: hash },
      { status: 202, headers: { 'cache-control': 'no-store' } }
    );
  const statusCode =
    attempt.state === 'pending' || attempt.state === 'delayed' ? 202 : 200;
  return json(
    {
      status: attempt.state,
      transactionHash: hash,
      message:
        attempt.state === 'rejected'
          ? 'The transaction could not be matched to this request.'
          : undefined
    },
    { status: statusCode, headers: { 'cache-control': 'no-store' } }
  );
}
