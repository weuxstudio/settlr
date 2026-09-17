import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import {
  compactSignatureToSignature,
  parseCompactSignature,
  serializeSignature
} from 'viem';
import { z } from 'zod';
import { verifyChallenge } from '$lib/server/auth';
import { isSameOrigin, readJson } from '$lib/server/request';
import { consumeRateLimit } from '$lib/server/rate-limit';

const bodySchema = z.object({
  message: z.string().min(1).max(4096),
  signature: z.string().regex(/^0x(?:[a-fA-F0-9]{128}|[a-fA-F0-9]{130})$/),
  nonce: z.string().min(8).max(64)
});

export async function POST({ request, cookies, url, platform }) {
  if (!isSameOrigin(request, url.origin))
    return json({ error: 'Origin is not allowed.' }, { status: 403 });
  const clientKey = request.headers.get('cf-connecting-ip') ?? 'unknown';
  let withinLimit;
  try {
    withinLimit = await consumeRateLimit(
      platform?.env.DB,
      `verify-auth:${clientKey}`,
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
    return json(
      { error: 'The signed message is incomplete.' },
      { status: 400 }
    );
  const normalizedSignature =
    parsed.data.signature.length === 130
      ? serializeSignature(
          compactSignatureToSignature(
            parseCompactSignature(parsed.data.signature as `0x${string}`)
          )
        )
      : parsed.data.signature;
  let session;
  try {
    session = await verifyChallenge(
      platform?.env.DB,
      parsed.data.message,
      normalizedSignature as `0x${string}`,
      parsed.data.nonce,
      url.origin
    );
  } catch {
    return json(
      { error: 'Authentication storage is temporarily unavailable.' },
      { status: 503 }
    );
  }
  if (!session)
    return json(
      {
        error:
          'Signature verification failed. Request a new message and try again.'
      },
      { status: 401 }
    );
  const localHost =
    url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  cookies.set('memomatch_session', session.sessionId, {
    path: '/',
    httpOnly: true,
    secure: (!dev && !localHost) || url.protocol === 'https:',
    sameSite: 'lax',
    maxAge: 86400
  });
  return json(
    { address: session.address },
    { headers: { 'cache-control': 'no-store' } }
  );
}
