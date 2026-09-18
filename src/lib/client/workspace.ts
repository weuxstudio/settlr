export type SignInPhase =
  'idle' | 'connecting' | 'network' | 'signature' | 'verifying';

/** A wallet connection is not a session. Only a server-confirmed session opens the workspace. */
export async function readWorkspaceSession(
  fetcher: typeof fetch = fetch
): Promise<string | null> {
  const response = await fetcher('/api/auth/session', { cache: 'no-store' });
  if (!response.ok)
    throw new Error('Sign-in is temporarily unavailable. Please try again.');
  const session = (await response.json()) as {
    authenticated?: boolean;
    address?: string;
  };
  if (session.authenticated === false) return null;
  if (
    session.authenticated === true &&
    /^0x[0-9a-fA-F]{40}$/.test(session.address ?? '')
  )
    return session.address!;
  throw new Error('The session could not be confirmed. Please try again.');
}

export function withoutCreateIntent(url: URL): string | null {
  if (url.searchParams.get('intent') !== 'create') return null;
  const clean = new URL(url);
  clean.searchParams.delete('intent');
  return clean.pathname + clean.search + clean.hash;
}

export function legacyWorkspaceTarget(hash: string): string | null {
  return ['#overview', '#requests', '#activity'].includes(hash)
    ? `/app${hash}`
    : null;
}
