import type { Handle } from '@sveltejs/kit';
import { ARC_ENVIRONMENT } from '$lib/config';

export const handle: Handle = async ({ event, resolve }) => {
  const runtimeNetwork = event.platform?.env.ARC_NETWORK;
  if (
    !import.meta.env.DEV &&
    runtimeNetwork &&
    runtimeNetwork !== ARC_ENVIRONMENT
  ) {
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
  const scriptSources = import.meta.env.DEV
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'";
  const devConnections = import.meta.env.DEV ? ' ws://127.0.0.1:5173' : '';
  response.headers.set(
    'content-security-policy',
    `default-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data:; connect-src 'self'${devConnections} https://rpc.mainnet.arc.io https://rpc.testnet.arc.io https://explorer.arc.io https://explorer.testnet.arc.io; script-src ${scriptSources}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com`
  );
  return response;
};
