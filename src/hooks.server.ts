import type { Handle } from '@sveltejs/kit';
import { ARC_ENVIRONMENT } from '$lib/config';

export const handle: Handle = async ({ event, resolve }) => {
  const runtimeNetwork = event.platform?.env.ARC_NETWORK;
  if (!import.meta.env.DEV && runtimeNetwork && runtimeNetwork !== ARC_ENVIRONMENT) {
    return new Response('Arc network configuration mismatch.', {
      status: 500,
      headers: { 'cache-control': 'no-store' }
    });
  }
  const response = await resolve(event);
  response.headers.set(
    'cache-control',
    response.headers.get('cache-control') ?? 'no-store'
  );
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'content-security-policy',
    "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data:; connect-src 'self' https://rpc.mainnet.arc.io https://rpc.testnet.arc.io https://explorer.arc.io https://explorer.testnet.arc.io; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:"
  );
  return response;
};
