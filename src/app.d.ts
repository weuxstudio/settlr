import type { D1Database, Fetcher, R2Bucket } from '@cloudflare/workers-types';

declare module '$env/static/public' {
  export const PUBLIC_ARC_NETWORK: string | undefined;
  export const PUBLIC_ARC_RPC_URL: string | undefined;
}

declare global {
  namespace App {
    interface Platform {
      env: {
        DB?: D1Database;
        ASSETS?: Fetcher;
        RECEIPTS?: R2Bucket;
        SESSION_SECRET?: string;
        PAYMENTS_ENABLED?: string;
        ARC_NETWORK?: string;
        ARC_RPC_URL?: string;
        ARC_START_BLOCK?: string;
      };
    }
    interface Locals {
      wallet?: string;
    }
  }
}

export {};
