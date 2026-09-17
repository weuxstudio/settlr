import { json } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth';

export async function GET({ cookies, platform }) {
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
  return json(
    { authenticated: Boolean(session), address: session?.address ?? null },
    { headers: { 'cache-control': 'no-store' } }
  );
}
