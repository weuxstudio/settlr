# Settlr

Settlr is an Arc payment request MVP for USDC. A recipient creates a request, shares a public link, and receives a verifiable settlement receipt. The payer uses an existing MetaMask or Rabby wallet. Funds move directly to the recipient.

The application is built with SvelteKit 2, Svelte 5, Tailwind CSS 4, daisyUI 5, Anime.js 4, Viem, Drizzle and Cloudflare Workers with D1.

## Current product surface

The application includes:

- A payment request dashboard with search and status filtering.
- A request creation flow with immutable amount, recipient and memo reference.
- Public Arc payment links with partial payment support.
- Public settlement receipts with explorer links and a print view.
- A standalone `@memomatch/arc-payment-core` package for memo and receipt verification.
- A scheduled Worker indexer that verifies memo transactions and stores idempotent payment records in D1.
- Durable SIWE challenges, hashed sessions, request ownership checks and public response models without private work labels.
- Canonical micro-USDC amounts with separate open, partial, paid and overpaid states.

Production fails closed when D1 is unavailable. Local development may use an empty in-memory store, but it is never seeded with payment requests and it cannot enable payments by default.

## Public entry and workspace

- `/` explains the product with illustrative sample data. It does not request wallet access or load private account data.
- `/app` checks the server session before showing the workspace. Signed-out visitors see a dedicated wallet sign-in screen.
- `/app?intent=create` opens the request form once after authentication, then removes the intent from the URL.
- Legacy `/#overview`, `/#requests` and `/#activity` links forward to the corresponding workspace anchor.
- `/docs`, `/pay/[token]` and `/receipt/[token]` retain their existing routes. Workspace actions point to `/app` and brand links point to `/`.

The entry screens use short Anime.js transitions and respect reduced-motion preferences. Sign-in reports connection, network switching, message signing and session verification separately. No transaction is sent during sign-in.

## Local development

```bash
npm install
npm run dev
```

The application runs at `http://localhost:5173`.

Useful checks:

```bash
npm run check
npm test
npm run build
```

## Arc configuration

The default local configuration uses Arc Testnet. Arc Mainnet uses chain ID `5042`, USDC `0x3600000000000000000000000000000000000000` and Memo `0x5294E9927c3306DcBaDb03fe70b92e01cCede505`. Set `PUBLIC_ARC_NETWORK=mainnet` only for an explicitly configured production build. The Worker rejects a build whose network does not match its runtime binding.

Runtime configuration belongs in Cloudflare Worker bindings or secrets. Private wallet keys are never required by Settlr. The browser wallet signs and sends the memo transaction, while the server verifies the final receipt.

The testnet configuration enables payment verification for wallet and receipt acceptance testing. Mainnet remains disabled with `PAYMENTS_ENABLED=false` until the corresponding production acceptance test is complete. The indexer also requires an explicit `ARC_START_BLOCK`; placeholder values intentionally fail the scheduled run instead of skipping historical blocks.

## D1 and Worker deployment

1. Create separate D1 databases for the web Worker and the indexer environments, then put their IDs into the corresponding Wrangler files. Use `wrangler.testnet.jsonc` for the isolated testnet web Worker and `wrangler.jsonc` for production.
2. Apply the versioned migrations with `npx wrangler d1 migrations apply memomatch --remote`.
3. Set the explicit network, RPC and start-block configuration for the selected environment.
4. Keep Mainnet disabled until the testnet walkthrough has verified a real receipt, then enable `PAYMENTS_ENABLED` only for the controlled production rollout.
5. Build with the matching network, for example `PUBLIC_ARC_NETWORK=testnet npm run build` or `PUBLIC_ARC_NETWORK=mainnet npm run build`, then deploy with the matching Wrangler file.

The scheduled Worker runs once per minute. It advances the sync cursor only after a block range has been read successfully. The unique transaction and log index constraint prevents duplicate payment records when an immediate verification and a scheduled run see the same transfer.

## Verification package

The core package has no SvelteKit or Cloudflare dependency:

```ts
import { deriveStatus, verifyReceipt } from '@memomatch/arc-payment-core';

const result = verifyReceipt(
  receipt,
  {
    memoId,
    recipient,
    amount: 250000000n
  },
  5042
);

if (result.ok) {
  const status = deriveStatus(250000000n, paidAmount);
}
```

Verification requires a successful Arc receipt, the expected Memo contract and memo ID, a supported USDC transfer call, the expected recipient and sender, a matching native transfer event, and a transfer identity that has not already been stored. The actual transfer may be a positive partial payment or an overpayment; the request status is derived from all verified inputs.

## Project structure

- `src/routes` contains the SvelteKit pages and HTTP endpoints.
- `src/lib/server` contains SIWE session logic, rate limiting, public response models and D1 access.
- `packages/arc-payment-core` contains chain-specific verification logic.
- `workers/indexer.ts` contains the scheduled D1 indexer.
- `migrations` contains versioned D1 SQL migrations.

Settlr is released under the MIT license.
