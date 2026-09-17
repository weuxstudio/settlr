<script lang="ts">
  import {
    ArrowLeft,
    ArrowUpRight,
    Check,
    Code2,
    Copy,
    ExternalLink,
    FileCheck2,
    ShieldCheck
  } from 'lucide-svelte';
  import {
    ARC_ENVIRONMENT,
    ARC_MEMO_ADDRESS,
    ARC_USDC_ADDRESS
  } from '$lib/config';

  let copied = '';
  async function copy(value: string, key: string) {
    await navigator.clipboard?.writeText(value);
    copied = key;
    setTimeout(() => (copied = ''), 1800);
  }
</script>

<svelte:head><title>Integration docs | MemoMatch</title></svelte:head>

<div class="min-h-screen bg-[#f6f8fb] px-5 py-8 text-[#172238] sm:py-12">
  <div class="mx-auto max-w-[1040px]">
    <div class="flex items-center justify-between">
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
      <a href="/" class="btn btn-ghost btn-sm gap-2 rounded-lg text-[#596579]"
        ><ArrowLeft size={15} />Back to overview</a
      >
    </div>
    <div class="mt-14 max-w-[720px]">
      <div
        class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#2454d6]"
      >
        <Code2 size={15} />Developer docs
      </div>
      <h1
        class="mt-5 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.025em]"
      >
        A payment reference that survives the handoff.
      </h1>
      <p class="mt-5 max-w-[610px] text-[16px] leading-7 text-[#66758b]">
        MemoMatch uses Arc's predeployed Memo contract to connect a USDC
        transfer with the payment request it settles. The recipient keeps
        custody throughout.
      </p>
    </div>

    <div class="mt-12 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <section
        class="rounded-xl border border-[#e0e6ef] bg-white p-6 shadow-[0_14px_40px_rgba(23,34,56,0.035)] sm:p-8"
      >
        <div class="flex items-center gap-3">
          <div
            class="grid h-9 w-9 place-items-center rounded-lg bg-[#eaf8f1] text-[#2b8c67]"
          >
            <ShieldCheck size={17} />
          </div>
          <div>
            <h2 class="text-[17px] font-semibold text-[#172238]">
              Verification flow
            </h2>
            <p class="mt-1 text-xs text-[#7f8a9d]">
              Seven checks before a payment counts.
            </p>
          </div>
        </div>
        <ol class="mt-7 space-y-5">
          {#each ['Confirm the configured Arc network and a successful receipt.', 'Find exactly one matching Memo event and memoId.', 'Compare the memo calldata hash with the transaction input.', 'Match sender, recipient and the actual native transfer amount.', 'Reject nested, ambiguous or ERC-20-only matches.', 'Store the network, transaction hash and log index.', 'Derive Open, Partially paid, Paid or Overpaid.'] as item, index}
            <li class="flex gap-3">
              <span
                class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#eef2ff] text-[11px] font-semibold text-[#2454d6]"
                >{index + 1}</span
              ><span class="pt-0.5 text-sm leading-6 text-[#596579]"
                >{item}</span
              >
            </li>
          {/each}
        </ol>
      </section>
      <section
        class="rounded-xl border border-[#cad7f7] bg-[#eef3ff] p-6 sm:p-8"
      >
        <div
          class="text-xs font-semibold uppercase tracking-[0.14em] text-[#2454d6]"
        >
          Arc contract references
        </div>
        <h2
          class="mt-5 text-[22px] font-semibold leading-[1.12] tracking-[-0.015em] text-[#172238]"
        >
          Use the network primitives.
        </h2>
        <div class="mt-7 space-y-4">
          <div>
            <div class="mb-2 text-[11px] font-semibold text-[#596b87]">
              Memo
            </div>
            <div
              class="flex items-center gap-2 rounded-lg border border-[#cedafa] bg-white/70 px-3 py-2.5"
            >
              <code
                class="min-w-0 flex-1 truncate font-mono text-[10px] text-[#596579]"
                >{ARC_MEMO_ADDRESS}</code
              ><button
                class="btn btn-ghost btn-xs rounded-md text-[#2454d6]"
                aria-label="Copy Memo address"
                onclick={() => copy(ARC_MEMO_ADDRESS, 'memo')}
                >{#if copied === 'memo'}<Check size={14} />{:else}<Copy
                    size={14}
                  />{/if}</button
              >
            </div>
          </div>
          <div>
            <div class="mb-2 text-[11px] font-semibold text-[#596b87]">
              USDC
            </div>
            <div
              class="flex items-center gap-2 rounded-lg border border-[#cedafa] bg-white/70 px-3 py-2.5"
            >
              <code
                class="min-w-0 flex-1 truncate font-mono text-[10px] text-[#596579]"
                >{ARC_USDC_ADDRESS}</code
              ><button
                class="btn btn-ghost btn-xs rounded-md text-[#2454d6]"
                aria-label="Copy USDC address"
                onclick={() => copy(ARC_USDC_ADDRESS, 'usdc')}
                >{#if copied === 'usdc'}<Check size={14} />{:else}<Copy
                    size={14}
                  />{/if}</button
              >
            </div>
          </div>
        </div>
        <a
          class="btn btn-primary btn-sm mt-7 h-9 rounded-lg"
          href="https://docs.arc.io/arc/concepts/transaction-memos"
          target="_blank"
          rel="noreferrer">Read Arc's memo docs<ExternalLink size={14} /></a
        >
      </section>
    </div>

    <section
      class="mt-5 rounded-xl border border-[#e0e6ef] bg-white p-6 shadow-[0_14px_40px_rgba(23,34,56,0.035)] sm:p-8"
    >
      <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div
            class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6f7e95]"
          >
            <FileCheck2 size={14} class="text-[#2454d6]" />Open source module
          </div>
          <h2
            class="mt-3 text-[22px] font-semibold tracking-[-0.015em] text-[#172238]"
          >
            Bring the verification logic into another Arc app.
          </h2>
          <p class="mt-2 max-w-[620px] text-sm leading-6 text-[#7f8a9d]">
            The core package has no SvelteKit or Cloudflare dependency. It
            exposes deterministic transfer extraction, receipt verification and
            status calculation.
          </p>
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          class="btn btn-ghost btn-sm gap-2 rounded-lg border border-[#dfe5ee] text-[#596579]"
          >View repository<ArrowUpRight size={14} /></a
        >
      </div>
      <pre
        class="mt-7 overflow-x-auto rounded-lg bg-[#172238] p-5 text-[11px] leading-6 text-[#d7e1f2]"><code
          >import &#123; verifyReceipt, deriveStatus &#125; from '@memomatch/arc-payment-core';

const result = verifyReceipt(receipt, &#123;
  memoId,
  recipient,
  amount: 250000000n
&#125;, chainId, transaction);

if (result.ok) &#123;
  const status = deriveStatus(250000000n, paidAmount);
&#125;</code
        ></pre>
    </section>
    <div
      class="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#8994a6]"
    >
      <span>Arc {ARC_ENVIRONMENT}</span><span>USDC native gas</span><span
        >No custody</span
      ><span>MIT licensed</span>
    </div>
  </div>
</div>
