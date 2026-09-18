<script lang="ts">
  import {
    AlertTriangle,
    Check,
    ChevronRight,
    Code2,
    Copy,
    Database,
    ExternalLink,
    KeyRound,
    LayoutDashboard,
    PackageCheck,
    ShieldCheck,
    WalletCards
  } from 'lucide-svelte';
  import { ARC_MEMO_ADDRESS, ARC_USDC_ADDRESS } from '$lib/config';

  const integrationExample = `import { createPublicClient, http } from 'viem';
import { arcTestnet } from 'viem/chains';
import {
  dedupeKey,
  deriveStatus,
  encodePaymentCall,
  makeMemoId,
  verifyReceipt
} from '@memomatch/arc-payment-core';

const requestedMicroUsdc = 250_000_000n; // 250 USDC
const memoId = makeMemoId();

// Store memoId with the request before sharing the payment link.
const call = encodePaymentCall(recipient, requestedMicroUsdc, memoId);
const hash = await walletClient.writeContract({ ...call, account });

const [receipt, transaction, chainId] = await Promise.all([
  publicClient.getTransactionReceipt({ hash }),
  publicClient.getTransaction({ hash }),
  publicClient.getChainId()
]);
const fromCode = (await publicClient.getBytecode({
  address: transaction.from
})) ?? '0x';

const result = verifyReceipt(
  receipt,
  { memoId, recipient },
  chainId,
  {
    hash: transaction.hash,
    from: transaction.from,
    fromCode,
    to: transaction.to ?? undefined,
    input: transaction.input
  }
);

if (!result.ok) throw new Error(result.reason);

const amountMicroUsdc = result.transfer.value / 10n ** 12n;
const paymentId = dedupeKey(
  'arc-testnet',
  hash,
  result.transfer.logIndex
);

await savePaymentOnce(paymentId, amountMicroUsdc);
const status = deriveStatus(
  requestedMicroUsdc,
  paidMicroUsdc + amountMicroUsdc
);`;

  const apiRows = [
    ['makeMemoId()', 'Creates a cryptographically random bytes32 reference.'],
    [
      'encodePaymentCall(recipient, amount, memoId)',
      'Builds the supported Arc Memo contract call around USDC.transfer.'
    ],
    [
      'extractUniqueTransfers(receipt)',
      'Reads authoritative native USDC transfer events from a receipt.'
    ],
    [
      'verifyReceipt(receipt, request, chainId, transaction)',
      'Checks the transaction, memo and matching transfer as one unit.'
    ],
    [
      'dedupeKey(network, hash, logIndex)',
      'Creates a deterministic identity for idempotent storage.'
    ],
    [
      'deriveStatus(expected, paid)',
      'Returns Open, Partially paid, Paid or Overpaid.'
    ]
  ];

  const verificationSteps = [
    'Confirm the configured Arc network and a successful transaction receipt.',
    'Require a direct call to the approved Arc Memo contract.',
    'Decode one supported USDC transfer and the memomatch:v1 format marker.',
    'Match the memo ID and the hash of the inner call data.',
    'Match transaction sender, memo sender and native transfer sender.',
    'Match recipient and amount against exactly one native transfer event.',
    'Store network, transaction hash and log index before updating status.'
  ];

  const rejectionRows = [
    [
      'Unsupported network',
      'The RPC chain does not match Arc Mainnet or Arc Testnet.'
    ],
    ['Transaction reverted', 'The transaction did not execute successfully.'],
    [
      'Memo reference not found',
      'The receipt does not contain the request memo ID.'
    ],
    [
      'Memo calldata hash mismatch',
      'The recorded memo does not describe the submitted inner call.'
    ],
    [
      'Matching transfer not found',
      'No authoritative native transfer matches sender, recipient and amount.'
    ],
    ['Ambiguous transfer', 'More than one transfer could satisfy the payment.'],
    [
      'Self payment is not supported',
      'The payer and recipient use the same address.'
    ],
    [
      'Contract wallets are not supported',
      'Version 0.1 accepts direct calls from externally owned accounts only.'
    ]
  ];

  let copied = '';
  let copyAnnouncement = '';
  async function copy(value: string, key: string) {
    await navigator.clipboard?.writeText(value);
    copied = key;
    copyAnnouncement = 'Copied to clipboard.';
    setTimeout(() => {
      copied = '';
      copyAnnouncement = '';
    }, 1800);
  }
</script>

<svelte:head><title>Developer documentation | MemoMatch</title></svelte:head>

<div class="min-h-screen bg-[#f6f8fb] px-5 py-8 text-[#172238] sm:py-12">
  <div class="mx-auto max-w-[1120px]">
    <header class="flex items-center justify-between gap-4">
      <a href="/" class="flex items-center gap-2.5 text-sm font-semibold"
        ><span
          class="grid h-8 w-8 place-items-center rounded-[9px] bg-[#172238] text-white"
          ><svg
            viewBox="0 0 24 24"
            class="h-4 w-4"
            fill="none"
            aria-hidden="true"
            ><path
              d="M5 17V7l4 5 3-4 3 4 4-5v10"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            /><circle cx="18.5" cy="6" r="1.5" fill="#8daeff" /></svg
          ></span
        >MemoMatch</a
      >
      <a href="/app" class="btn btn-ghost btn-sm gap-2 rounded-lg text-[#596579]"
        ><LayoutDashboard size={15} />Open app</a
      >
    </header>

    <main>
      <section class="mt-14 max-w-[800px]">
        <div
          class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#2454d6]"
        >
          <Code2 size={15} />Developer documentation
        </div>
        <h1
          class="mt-5 text-[clamp(2.3rem,6vw,4.7rem)] font-semibold leading-[0.98] tracking-[-0.035em]"
        >
          Verify Arc payments with a reusable core.
        </h1>
        <p class="mt-6 max-w-[680px] text-[17px] leading-7 text-[#66758b]">
          MemoMatch binds a payment request to a direct USDC transfer through
          Arc's Memo contract. The core package verifies the reference without
          taking custody of funds.
        </p>
        <div class="mt-7 flex flex-wrap gap-2 text-xs font-semibold">
          <span class="rounded-full bg-[#eaf8f1] px-3 py-2 text-[#257b5d]"
            >MIT licensed</span
          ><span class="rounded-full bg-[#eef2ff] px-3 py-2 text-[#4567b7]"
            >Version 0.1.0</span
          ><span class="rounded-full bg-[#fff6e6] px-3 py-2 text-[#946113]"
            >Source only preview</span
          >
        </div>
        <div
          class="mt-6 flex items-start gap-3 rounded-xl border border-[#ead9ad] bg-[#fff9eb] px-4 py-3.5 text-sm leading-6 text-[#76591d]"
        >
          <AlertTriangle size={17} class="mt-0.5 shrink-0" />
          <p>
            Version 0.1 is available only inside this source workspace. The
            package is private and is not published to npm. This guide documents
            the current implementation for evaluation and local use.
          </p>
        </div>
      </section>

      <p class="sr-only" aria-live="polite">{copyAnnouncement}</p>

      <nav
        aria-label="Documentation sections"
        class="sticky top-0 z-30 -mx-5 mt-10 flex gap-1 overflow-x-auto border-y border-[#dfe5ee] bg-[#f6f8fb]/95 px-5 py-3 text-sm font-medium text-[#66758b] backdrop-blur-xl sm:mx-0 sm:border-t-0 sm:px-0"
      >
        {#each [['#choose', 'Choose a path'], ['#quick-start', 'Quick start'], ['#api', 'API'], ['#errors', 'Errors'], ['#operations', 'Operations']] as link}
          <a
            href={link[0]}
            class="shrink-0 rounded-lg px-3 py-2 transition-colors hover:bg-white hover:text-[#2454d6]"
            >{link[1]}</a
          >
        {/each}
      </nav>

      <section id="choose" class="scroll-mt-6 pt-14">
        <div class="max-w-[680px]">
          <div
            class="text-xs font-semibold uppercase tracking-[0.14em] text-[#6f7e95]"
          >
            Choose a path
          </div>
          <h2 class="mt-3 text-3xl font-semibold tracking-[-0.025em]">
            Use the hosted flow or own the infrastructure.
          </h2>
          <p class="mt-3 text-sm leading-6 text-[#66758b]">
            Both approaches send funds directly to the recipient. The difference
            is who operates payment links, indexing and storage.
          </p>
        </div>
        <div class="mt-7 grid gap-5 md:grid-cols-2">
          <article class="rounded-2xl border border-[#cfdcf3] bg-white p-7">
            <div
              class="grid h-10 w-10 place-items-center rounded-xl bg-[#e9efff] text-[#2454d6]"
            >
              <WalletCards size={19} />
            </div>
            <h3 class="mt-5 text-xl font-semibold">Hosted MemoMatch</h3>
            <p class="mt-2 text-sm leading-6 text-[#66758b]">
              Create payment links and let MemoMatch operate verification,
              recovery, receipts and the payment dashboard.
            </p>
            <ul class="mt-5 space-y-3 text-sm text-[#596579]">
              <li class="flex gap-2">
                <Check size={16} class="mt-0.5 shrink-0 text-[#2b8c67]" />No
                indexer to operate
              </li>
              <li class="flex gap-2">
                <Check
                  size={16}
                  class="mt-0.5 shrink-0 text-[#2b8c67]"
                />Payment links and receipts included
              </li>
              <li class="flex gap-2">
                <Check
                  size={16}
                  class="mt-0.5 shrink-0 text-[#2b8c67]"
                />Suitable for service teams
              </li>
            </ul>
            <a href="/app" class="btn btn-primary btn-sm mt-6 h-10 rounded-lg px-4"
              >Open payment workspace<ChevronRight size={15} /></a
            >
          </article>
          <article class="rounded-2xl border border-[#dfe5ee] bg-white p-7">
            <div
              class="grid h-10 w-10 place-items-center rounded-xl bg-[#f1f4f8] text-[#596b87]"
            >
              <PackageCheck size={19} />
            </div>
            <h3 class="mt-5 text-xl font-semibold">Core package</h3>
            <p class="mt-2 text-sm leading-6 text-[#66758b]">
              Embed deterministic verification in an existing marketplace,
              billing system or product workflow.
            </p>
            <ul class="mt-5 space-y-3 text-sm text-[#596579]">
              <li class="flex gap-2">
                <Check size={16} class="mt-0.5 shrink-0 text-[#2b8c67]" />No
                SvelteKit or Cloudflare dependency
              </li>
              <li class="flex gap-2">
                <Check
                  size={16}
                  class="mt-0.5 shrink-0 text-[#2b8c67]"
                />Infrastructure stays under operator control
              </li>
              <li class="flex gap-2">
                <Check
                  size={16}
                  class="mt-0.5 shrink-0 text-[#2b8c67]"
                />Suitable for product teams
              </li>
            </ul>
            <a
              href="#quick-start"
              class="btn btn-ghost btn-sm mt-6 h-10 rounded-lg border border-[#d8e1ee] bg-white px-4"
              >Review source integration<ChevronRight size={15} /></a
            >
          </article>
        </div>
      </section>

      <section id="quick-start" class="scroll-mt-6 pt-16">
        <div
          class="mb-8 grid overflow-hidden rounded-2xl border border-[#dfe5ee] bg-white sm:grid-cols-3"
        >
          <div class="border-b border-[#edf0f5] p-5 sm:border-b-0 sm:border-r">
            <div class="text-xs font-semibold text-[#7f8a9d]">Availability</div>
            <div class="mt-2 text-sm font-semibold text-[#172238]">
              Source workspace only
            </div>
          </div>
          <div class="border-b border-[#edf0f5] p-5 sm:border-b-0 sm:border-r">
            <div class="text-xs font-semibold text-[#7f8a9d]">Package path</div>
            <code class="mt-2 block break-all font-mono text-xs text-[#33415b]"
              >packages/arc-payment-core</code
            >
          </div>
          <div class="p-5">
            <div class="text-xs font-semibold text-[#7f8a9d]">
              Validated with
            </div>
            <div class="mt-2 text-sm font-semibold text-[#172238]">
              Node 22 · TypeScript 5.9 · Viem 2.37
            </div>
          </div>
        </div>
        <div
          class="mb-8 flex flex-col gap-3 rounded-xl border border-[#dfe5ee] bg-[#172238] px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div class="text-xs font-semibold text-[#aebbd0]">
              Local workspace setup
            </div>
            <p class="mt-1 text-xs text-[#8f9db3]">
              Run from the repository root before importing the private
              workspace package.
            </p>
          </div>
          <code
            class="whitespace-pre font-mono text-xs leading-6 text-[#d7e1f2]"
            >npm install npm run check</code
          >
        </div>
        <div class="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div>
            <div
              class="text-xs font-semibold uppercase tracking-[0.14em] text-[#6f7e95]"
            >
              Quick start
            </div>
            <h2 class="mt-3 text-3xl font-semibold tracking-[-0.025em]">
              One reference, one verified transfer.
            </h2>
            <ol class="mt-6 space-y-4">
              {#each ['Create and persist a random memo ID.', 'Build the supported Memo contract call.', 'Let the payer submit it from an EOA wallet.', 'Load the transaction, receipt and sender code.', 'Verify, deduplicate and store the transfer.', 'Derive status from all verified payments.'] as item, index}
                <li class="flex gap-3 text-sm leading-6 text-[#596579]">
                  <span
                    class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#eef2ff] text-[11px] font-semibold text-[#2454d6]"
                    >{index + 1}</span
                  >
                  <span>{item}</span>
                </li>
              {/each}
            </ol>
          </div>
          <div
            class="min-w-0 overflow-hidden rounded-2xl border border-[#283650] bg-[#172238] shadow-[0_18px_48px_rgba(23,34,56,0.12)]"
          >
            <div
              class="flex items-center justify-between border-b border-white/10 px-5 py-3 text-xs text-[#aebbd0]"
            >
              <span>TypeScript</span>
              <button
                class="btn btn-ghost btn-xs rounded-md text-[#d7e1f2]"
                aria-label="Copy integration example"
                onclick={() => copy(integrationExample, 'example')}
              >
                {#if copied === 'example'}<Check size={14} />Copied{:else}<Copy
                    size={14}
                  />Copy{/if}
              </button>
            </div>
            <pre
              class="max-h-[620px] overflow-auto p-5 text-[11px] leading-6 text-[#d7e1f2]"><code
                >{integrationExample}</code
              ></pre>
          </div>
        </div>
      </section>

      <section class="pt-16">
        <div class="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          <article
            class="rounded-2xl border border-[#e0e6ef] bg-white p-6 sm:p-8"
          >
            <div class="flex items-center gap-3">
              <div
                class="grid h-9 w-9 place-items-center rounded-lg bg-[#eaf8f1] text-[#2b8c67]"
              >
                <ShieldCheck size={17} />
              </div>
              <div>
                <h2 class="text-lg font-semibold">Verification rules</h2>
                <p class="mt-1 text-xs text-[#7f8a9d]">
                  All checks must pass before storage.
                </p>
              </div>
            </div>
            <ol class="mt-7 space-y-4">
              {#each verificationSteps as item, index}
                <li class="flex gap-3">
                  <span
                    class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#eef2ff] text-[11px] font-semibold text-[#2454d6]"
                    >{index + 1}</span
                  >
                  <span class="pt-0.5 text-sm leading-6 text-[#596579]"
                    >{item}</span
                  >
                </li>
              {/each}
            </ol>
          </article>
          <article
            class="rounded-2xl border border-[#cad7f7] bg-[#eef3ff] p-6 sm:p-8"
          >
            <div
              class="text-xs font-semibold uppercase tracking-[0.14em] text-[#2454d6]"
            >
              Arc contract references
            </div>
            <h2 class="mt-4 text-2xl font-semibold tracking-[-0.02em]">
              Use the configured network primitives.
            </h2>
            <div class="mt-7 space-y-4">
              {#each [['Memo contract', ARC_MEMO_ADDRESS, 'memo'], ['USDC contract', ARC_USDC_ADDRESS, 'usdc']] as contract}
                <div>
                  <div class="mb-2 text-xs font-semibold text-[#596b87]">
                    {contract[0]}
                  </div>
                  <div
                    class="flex items-center gap-2 rounded-lg border border-[#cedafa] bg-white/75 px-3 py-3"
                  >
                    <code
                      class="min-w-0 flex-1 truncate font-mono text-[11px] text-[#596579]"
                      >{contract[1]}</code
                    >
                    <button
                      class="btn btn-ghost btn-xs rounded-md text-[#2454d6]"
                      aria-label={`Copy ${contract[0]}`}
                      onclick={() => copy(contract[1], contract[2])}
                    >
                      {#if copied === contract[2]}<Check
                          size={14}
                        />{:else}<Copy size={14} />{/if}
                    </button>
                  </div>
                </div>
              {/each}
            </div>
            <a
              class="btn btn-primary btn-sm mt-7 h-10 rounded-lg"
              href="https://docs.arc.io/arc/concepts/transaction-memos"
              target="_blank"
              rel="noreferrer"
              >Read Arc Memo documentation<ExternalLink size={14} /></a
            >
          </article>
        </div>
      </section>

      <section id="api" class="scroll-mt-6 pt-16">
        <div class="max-w-[680px]">
          <div
            class="text-xs font-semibold uppercase tracking-[0.14em] text-[#6f7e95]"
          >
            Core API
          </div>
          <h2 class="mt-3 text-3xl font-semibold tracking-[-0.025em]">
            Small surface, explicit responsibilities.
          </h2>
          <p class="mt-3 text-sm leading-6 text-[#66758b]">
            Amounts use micro USDC. One USDC equals 1,000,000 units. Native Arc
            transfer events use 18 decimals and must be converted with integer
            arithmetic.
          </p>
        </div>
        <div
          class="mt-7 overflow-hidden rounded-2xl border border-[#dfe5ee] bg-white"
        >
          {#each apiRows as row}
            <div
              class="grid gap-2 border-b border-[#edf0f5] px-5 py-5 last:border-b-0 md:grid-cols-[minmax(260px,0.8fr)_1.2fr] md:gap-8 md:px-7"
            >
              <code
                class="break-words font-mono text-xs font-semibold text-[#2454d6]"
                >{row[0]}</code
              >
              <p class="text-sm leading-6 text-[#596579]">{row[1]}</p>
            </div>
          {/each}
        </div>
        <div
          class="mt-5 grid gap-5 rounded-2xl border border-[#dfe5ee] bg-white p-6 md:grid-cols-2"
        >
          <div>
            <div
              class="text-xs font-semibold uppercase tracking-[0.12em] text-[#6f7e95]"
            >
              Successful verification
            </div>
            <code class="mt-3 block font-mono text-xs leading-6 text-[#257b5d]"
              >{`{ ok: true, transfer: VerifiedTransfer }`}</code
            >
          </div>
          <div>
            <div
              class="text-xs font-semibold uppercase tracking-[0.12em] text-[#6f7e95]"
            >
              Deterministic rejection
            </div>
            <code class="mt-3 block font-mono text-xs leading-6 text-[#9b4f4f]"
              >{`{ ok: false, reason: string }`}</code
            >
          </div>
        </div>
      </section>

      <section class="pt-16">
        <div class="grid gap-5 md:grid-cols-2">
          <article class="rounded-2xl border border-[#e0e6ef] bg-white p-7">
            <div
              class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-[#6f7e95]"
            >
              <Database size={15} class="text-[#2454d6]" />Partial and excess
              payments
            </div>
            <h2 class="mt-4 text-xl font-semibold">
              Verify transfers independently.
            </h2>
            <p class="mt-3 text-sm leading-6 text-[#66758b]">
              Every positive transfer can settle part of a request. Store each
              verified transfer once, sum its micro USDC amount and call <code
                class="font-mono text-xs text-[#33415b]">deriveStatus</code
              >. Never reject a valid transfer only because it differs from the
              outstanding amount.
            </p>
          </article>
          <article class="rounded-2xl border border-[#e0e6ef] bg-white p-7">
            <div
              class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-[#6f7e95]"
            >
              <KeyRound size={15} class="text-[#2454d6]" />Reference storage
            </div>
            <h2 class="mt-4 text-xl font-semibold">
              Keep identifiers separate.
            </h2>
            <p class="mt-3 text-sm leading-6 text-[#66758b]">
              Generate the bytes32 <code
                class="font-mono text-xs text-[#33415b]">memoId</code
              > once and bind it to an immutable request. Use a separate random token
              for a public payment URL. Store no customer name, invoice title or private
              description onchain.
            </p>
          </article>
        </div>
      </section>

      <section id="errors" class="scroll-mt-6 pt-16">
        <div class="max-w-[680px]">
          <div
            class="text-xs font-semibold uppercase tracking-[0.14em] text-[#6f7e95]"
          >
            Verification results
          </div>
          <h2 class="mt-3 text-3xl font-semibold tracking-[-0.025em]">
            Reject mismatches. Retry unavailable data.
          </h2>
          <p class="mt-3 text-sm leading-6 text-[#66758b]">
            A missing receipt or temporary RPC failure is not a final rejection.
            Retry it. A completed receipt that fails a deterministic rule should
            remain rejected.
          </p>
        </div>
        <div
          class="mt-7 grid gap-x-8 overflow-hidden rounded-2xl border border-[#dfe5ee] bg-white md:grid-cols-2 md:p-2"
        >
          {#each rejectionRows as row}
            <div class="border-b border-[#edf0f5] px-5 py-5 md:last:border-b-0">
              <div class="font-mono text-xs font-semibold text-[#9b4f4f]">
                {row[0]}
              </div>
              <p class="mt-2 text-sm leading-6 text-[#66758b]">{row[1]}</p>
            </div>
          {/each}
        </div>
      </section>

      <section id="operations" class="scroll-mt-6 pt-16">
        <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div
              class="text-xs font-semibold uppercase tracking-[0.14em] text-[#6f7e95]"
            >
              Networks and operation
            </div>
            <h2 class="mt-3 text-3xl font-semibold tracking-[-0.025em]">
              Separate test and production data.
            </h2>
            <div
              class="mt-7 overflow-hidden rounded-2xl border border-[#dfe5ee] bg-white"
            >
              <div
                class="hidden grid-cols-[1fr_100px_110px] border-b border-[#edf0f5] bg-[#fbfcfe] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8994a6] sm:grid"
              >
                <span>Environment</span><span>Chain ID</span><span
                  >Payments</span
                >
              </div>
              <div
                class="grid grid-cols-2 gap-x-4 gap-y-4 px-5 py-4 text-sm text-[#596579] sm:grid-cols-[1fr_100px_110px] sm:gap-0"
              >
                <span
                  ><span
                    class="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8994a6] sm:hidden"
                    >Environment</span
                  >Arc Testnet</span
                ><span
                  ><span
                    class="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8994a6] sm:hidden"
                    >Chain ID</span
                  ><code class="font-mono text-xs">5042002</code></span
                ><span class="col-span-2 text-[#257b5d] sm:col-span-1"
                  ><span
                    class="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8994a6] sm:hidden"
                    >Payments</span
                  >Enabled locally</span
                >
              </div>
              <div
                class="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-[#edf0f5] px-5 py-4 text-sm text-[#596579] sm:grid-cols-[1fr_100px_110px] sm:gap-0"
              >
                <span
                  ><span
                    class="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8994a6] sm:hidden"
                    >Environment</span
                  >Arc Mainnet</span
                ><span
                  ><span
                    class="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8994a6] sm:hidden"
                    >Chain ID</span
                  ><code class="font-mono text-xs">5042</code></span
                ><span class="col-span-2 text-[#946113] sm:col-span-1"
                  ><span
                    class="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8994a6] sm:hidden"
                    >Payments</span
                  >Acceptance gated</span
                >
              </div>
            </div>
            <p class="mt-4 text-sm leading-6 text-[#66758b]">
              Use separate databases, RPC configuration, sessions and indexer
              cursors. Configure an explicit start block. Advance the cursor
              only after a complete block range is stored.
            </p>
          </div>
          <aside class="rounded-2xl border border-[#e0e6ef] bg-white p-7">
            <div
              class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-[#6f7e95]"
            >
              <WalletCards size={15} class="text-[#2454d6]" />Wallet support
            </div>
            <h2 class="mt-4 text-xl font-semibold">
              Direct EOA calls in version 0.1.
            </h2>
            <p class="mt-3 text-sm leading-6 text-[#66758b]">
              The reference interface supports injected MetaMask and Rabby
              providers on desktop and supported wallet browsers. The verifier
              rejects contract wallet senders, nested memos and bundled
              payments.
            </p>
            <div
              class="mt-5 rounded-xl bg-[#f7f9fc] p-4 text-xs leading-5 text-[#596b87]"
            >
              Wallet keys never enter MemoMatch. The payer signs and submits the
              transaction in the wallet.
            </div>
          </aside>
        </div>
      </section>
    </main>

    <footer
      class="flex flex-wrap items-center justify-between gap-3 border-t border-[#dfe5ee] py-6 text-xs text-[#8994a6]"
    >
      <span>MemoMatch core 0.1.0 · Source only preview</span>
      <span>MIT licensed · No custody</span>
    </footer>
  </div>
</div>
