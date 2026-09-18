import { describe, expect, it, vi } from 'vitest';
import {
  readWorkspaceSession,
  withoutCreateIntent,
  legacyWorkspaceTarget
} from './workspace';

const address = `0x${'ab'.repeat(20)}`;
const fetchResponse = (body: unknown, status = 200) =>
  vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe('workspace session boundary', () => {
  it('only accepts a server-confirmed session and bypasses the cache', async () => {
    const fetcher = fetchResponse({ authenticated: true, address });
    expect(await readWorkspaceSession(fetcher)).toBe(address);
    expect(fetcher).toHaveBeenCalledWith('/api/auth/session', {
      cache: 'no-store'
    });
  });
  it('does not treat a wallet address as authentication', async () => {
    expect(
      await readWorkspaceSession(
        fetchResponse({ authenticated: false, address })
      )
    ).toBeNull();
    await expect(
      readWorkspaceSession(fetchResponse({ address }))
    ).rejects.toThrow('could not be confirmed');
  });
  it('distinguishes an unavailable session store from being signed out', async () => {
    await expect(
      readWorkspaceSession(fetchResponse({ authenticated: false }, 503))
    ).rejects.toThrow('temporarily unavailable');
  });
  it('rejects an invalid authenticated session', async () => {
    await expect(
      readWorkspaceSession(
        fetchResponse({ authenticated: true, address: 'invalid' })
      )
    ).rejects.toThrow();
  });
});

describe('workspace navigation', () => {
  it('consumes the create action once while preserving unrelated URL state', () => {
    const original = new URL(
      'https://example.test/app?intent=create&source=landing#requests'
    );
    const clean = withoutCreateIntent(original);
    expect(clean).toBe('/app?source=landing#requests');
    expect(withoutCreateIntent(new URL(clean!, original))).toBeNull();
    expect(original.searchParams.get('intent')).toBe('create');
  });
  it('preserves old dashboard anchors without redirecting landing sections', () => {
    expect(legacyWorkspaceTarget('#requests')).toBe('/app#requests');
    expect(legacyWorkspaceTarget('#activity')).toBe('/app#activity');
    expect(legacyWorkspaceTarget('#overview')).toBe('/app#overview');
    expect(legacyWorkspaceTarget('#how-it-works')).toBeNull();
    expect(legacyWorkspaceTarget('')).toBeNull();
  });
});
