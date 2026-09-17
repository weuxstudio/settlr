import { json } from '@sveltejs/kit';
import { revokeSession } from '$lib/server/auth';
import { isSameOrigin } from '$lib/server/request';

export async function POST({ request, url, cookies, platform }) {
  if (!isSameOrigin(request, url.origin))
    return json({ error: 'Origin is not allowed.' }, { status: 403 });
  try {
    await revokeSession(platform?.env.DB, cookies.get('memomatch_session'));
  } catch {
    return json(
      { error: 'Authentication storage is temporarily unavailable.' },
      { status: 503 }
    );
  }
  cookies.delete('memomatch_session', { path: '/' });
  return json({ ok: true });
}
