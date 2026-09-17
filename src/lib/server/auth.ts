import {
  createSiweMessage,
  generateSiweNonce,
  parseSiweMessage
} from 'viem/siwe';
import { getAddress, verifyMessage, type Address } from 'viem';
import type { D1Database } from '@cloudflare/workers-types';
import { dev } from '$app/environment';
import { ARC_CHAIN_ID } from '$lib/config';

type StoreDatabase = D1Database | undefined;
type Challenge = {
  address: Address;
  nonce: string;
  message: string;
  expiresAt: number;
};
type Session = { address: Address; expiresAt: number };
type ChallengeRow = {
  nonce: string;
  address: string;
  message: string;
  expires_at: number;
  consumed_at: number | null;
};
type SessionRow = { address: string; expires_at: number };

const memoryChallenges = new Map<string, Challenge>();
const memorySessions = new Map<string, Session>();

export const MAX_SIWE_NONCE_LENGTH = 128;

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token)
  );
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, '0')
  ).join('');
}

function developmentOnly() {
  if (!dev)
    throw new Error('Persistent authentication storage is unavailable.');
}

export async function createChallenge(
  db: StoreDatabase,
  address: string,
  origin: string
) {
  const normalized = getAddress(address as Address);
  const nonce = generateSiweNonce();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const message = createSiweMessage({
    address: normalized,
    chainId: ARC_CHAIN_ID,
    domain: new URL(origin).host,
    uri: origin,
    version: '1',
    nonce,
    statement: 'Sign in to MemoMatch to manage your payment requests.',
    expirationTime: new Date(expiresAt)
  });
  if (db) {
    await db
      .prepare(
        'INSERT INTO auth_challenges(nonce, address, message, expires_at) VALUES (?, ?, ?, ?)'
      )
      .bind(nonce, normalized, message, expiresAt)
      .run();
  } else {
    developmentOnly();
    memoryChallenges.set(nonce, {
      address: normalized,
      nonce,
      message,
      expiresAt
    });
  }
  return { message, nonce };
}

export async function verifyChallenge(
  db: StoreDatabase,
  message: string,
  signature: `0x${string}`,
  nonce: string,
  origin: string
) {
  const challenge = db
    ? await db
        .prepare(
          'SELECT nonce, address, message, expires_at, consumed_at FROM auth_challenges WHERE nonce = ?'
        )
        .bind(nonce)
        .first<ChallengeRow>()
    : memoryChallenges.get(nonce);
  if (!challenge) return undefined;
  const expiresAt =
    'expires_at' in challenge ? challenge.expires_at : challenge.expiresAt;
  if (
    expiresAt < Date.now() ||
    challenge.message !== message ||
    ('consumed_at' in challenge && challenge.consumed_at)
  )
    return undefined;
  const parsed = parseSiweMessage(message);
  if (
    !parsed.address ||
    parsed.address.toLowerCase() !== challenge.address.toLowerCase()
  )
    return undefined;
  const domain = new URL(origin).host;
  if (
    parsed.domain !== domain ||
    parsed.chainId !== ARC_CHAIN_ID ||
    parsed.nonce !== nonce
  )
    return undefined;
  const valid = await verifyMessage({
    address: parsed.address,
    message,
    signature
  });
  if (!valid) return undefined;

  if (db) {
    const consumed = await db
      .prepare(
        'UPDATE auth_challenges SET consumed_at = ? WHERE nonce = ? AND consumed_at IS NULL AND expires_at > ?'
      )
      .bind(Date.now(), nonce, Date.now())
      .run();
    if ((consumed.meta?.changes ?? 0) !== 1) return undefined;
  } else {
    developmentOnly();
    if (!memoryChallenges.delete(nonce)) return undefined;
  }

  const sessionToken = `mm_${crypto.randomUUID()}_${crypto.randomUUID()}`;
  const sessionId = db ? await hashToken(sessionToken) : sessionToken;
  const session = {
    address: challenge.address as Address,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  };
  if (db) {
    await db
      .prepare(
        'INSERT INTO sessions(token_hash, address, expires_at, created_at) VALUES (?, ?, ?, ?)'
      )
      .bind(sessionId, session.address, session.expiresAt, Date.now())
      .run();
  } else {
    memorySessions.set(sessionId, session);
  }
  return { sessionId: sessionToken, address: session.address };
}

export async function getSession(db: StoreDatabase, sessionToken?: string) {
  if (!sessionToken) return undefined;
  if (!db) {
    developmentOnly();
    const session = memorySessions.get(sessionToken);
    if (!session || session.expiresAt < Date.now()) {
      memorySessions.delete(sessionToken);
      return undefined;
    }
    return session;
  }
  const tokenHash = await hashToken(sessionToken);
  const session = await db
    .prepare(
      'SELECT address, expires_at FROM sessions WHERE token_hash = ? AND expires_at > ?'
    )
    .bind(tokenHash, Date.now())
    .first<SessionRow>();
  return session
    ? { address: session.address as Address, expiresAt: session.expires_at }
    : undefined;
}

export async function revokeSession(db: StoreDatabase, sessionToken?: string) {
  if (!sessionToken) return;
  if (!db) {
    developmentOnly();
    memorySessions.delete(sessionToken);
    return;
  }
  await db
    .prepare('DELETE FROM sessions WHERE token_hash = ?')
    .bind(await hashToken(sessionToken))
    .run();
}

export async function cleanupAuth(db: StoreDatabase) {
  if (db) {
    await db.batch([
      db
        .prepare('DELETE FROM auth_challenges WHERE expires_at <= ?')
        .bind(Date.now()),
      db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(Date.now())
    ]);
  } else if (dev) {
    for (const [nonce, challenge] of memoryChallenges)
      if (challenge.expiresAt <= Date.now()) memoryChallenges.delete(nonce);
    for (const [token, session] of memorySessions)
      if (session.expiresAt <= Date.now()) memorySessions.delete(token);
  }
}
