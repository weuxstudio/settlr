import type { D1Database, Fetcher, R2Bucket } from '@cloudflare/workers-types';

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
