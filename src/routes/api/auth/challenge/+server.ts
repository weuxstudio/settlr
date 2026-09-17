import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { createChallenge } from '$lib/server/auth';
import { isSameOrigin, readJson } from '$lib/server/request';
import { consumeRateLimit } from '$lib/server/rate-limit';

const bodySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/)
});

export async function POST({ request, url, platform }) {
  if (!isSameOrigin(request, url.origin))
    return json({ error: 'Origin is not allowed.' }, { status: 403 });
  const clientKey = request.headers.get('cf-connecting-ip') ?? 'unknown';
  let withinLimit;
  try {
    withinLimit = await consumeRateLimit(
      platform?.env.DB,
      `challenge:${clientKey}`,
      10,
      60
    );
  } catch {
    return json(
      { error: 'Request limits are temporarily unavailable.' },
      { status: 503 }
    );
  }
  if (!withinLimit)
    return json(
      { error: 'Too many sign-in attempts. Try again shortly.' },
      { status: 429, headers: { 'retry-after': '60' } }
    );
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success)
    return json({ error: 'Enter a valid wallet address.' }, { status: 400 });
  try {
    return json(
      await createChallenge(platform?.env.DB, parsed.data.address, url.origin),
      { headers: { 'cache-control': 'no-store' } }
    );
  } catch {
    return json(
      { error: 'Could not create a wallet challenge.' },
      { status: 503 }
    );
  }
}
