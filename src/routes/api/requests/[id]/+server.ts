import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { getRequest, updateRequest } from '$lib/server/store';
import { getSession } from '$lib/server/auth';
import { isSameOrigin, readJson } from '$lib/server/request';

const updateSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  publicDescription: z.string().trim().min(1).max(160).optional(),
  requesterName: z.string().trim().min(2).max(60).optional(),
  publicReference: z.string().trim().max(80).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal('')),
  closed: z.boolean().optional()
});

export async function GET({ params, cookies, platform }) {
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
  let item;
  try {
    item = await getRequest(platform?.env.DB, params.id, session.address);
  } catch {
    return json(
      { error: 'Request storage is temporarily unavailable.' },
      { status: 503 }
    );
  }
  return item
    ? json({ request: item })
    : json({ error: 'Payment request not found.' }, { status: 404 });
}

export async function PATCH({ params, request, cookies, platform, url }) {
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
      { error: 'Connect a wallet and sign in first.' },
      { status: 401 }
    );
  let item;
  try {
    item = await getRequest(platform?.env.DB, params.id, session.address);
  } catch {
    return json(
      { error: 'Request storage is temporarily unavailable.' },
      { status: 503 }
    );
  }
  if (!item)
    return json({ error: 'Payment request not found.' }, { status: 404 });
  const parsed = updateSchema.safeParse(await readJson(request));
  if (!parsed.success)
    return json({ error: 'The update is invalid.' }, { status: 400 });
  let updated;
  try {
    updated = await updateRequest(
      platform?.env.DB,
      params.id,
      session.address,
      {
        ...(parsed.data.title ? { title: parsed.data.title } : {}),
        ...(parsed.data.publicDescription
          ? { publicDescription: parsed.data.publicDescription }
          : {}),
        ...(parsed.data.requesterName
          ? { requesterName: parsed.data.requesterName }
          : {}),
        ...(parsed.data.publicReference !== undefined
          ? { publicReference: parsed.data.publicReference }
          : {}),
        ...(parsed.data.dueDate !== undefined
          ? { dueDate: parsed.data.dueDate }
          : {}),
        ...(parsed.data.closed ? { closedAt: new Date().toISOString() } : {})
      }
    );
  } catch {
    return json(
      { error: 'Request storage is temporarily unavailable.' },
      { status: 503 }
    );
  }
  return json({ request: updated });
}
