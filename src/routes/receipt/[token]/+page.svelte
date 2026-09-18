<script lang="ts">
  import { onMount } from 'svelte';
  import {
    ArrowLeft,
    CheckCircle2,
    ExternalLink,
    FileCheck2,
    Printer
  } from 'lucide-svelte';
  import { formatDate, formatUsdcBaseUnits } from '$lib/format';
  import { shortenAddress } from '$lib/config';
  import type { PaymentRequest, PaymentStatus } from '$lib/types';

  type PublicReceipt = {
    token: string;
    amountMicroUsdc: string;
    paidMicroUsdc: string;
    remainingMicroUsdc: string;
    overpaidMicroUsdc: string;
    status: PaymentStatus;
    memoId: string;
    payments: PaymentRequest['payments'];
  };
  let request: PublicReceipt | null = null;
  let error = '';
  $: receiptStatus = request ? getStatus(request) : 'Open';

  function getStatus(item: PublicReceipt): PaymentStatus {
    return item.status;
  }

  onMount(async () => {
    const token = window.location.pathname.split('/').pop();
    const response = await fetch(`/api/receipts/${token}`);
    if (!response.ok) error = 'This receipt is not available.';
    else request = (await response.json()).request;
  });
</script>

<svelte:head><title>Payment receipt | MemoMatch</title></svelte:head>

<div
  class="min-h-screen bg-[#f6f8fb] px-5 py-8 text-[#172238] print:bg-white sm:py-12"
>
  <div class="mx-auto max-w-[760px]">
    <div class="flex items-center justify-between print:hidden">
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
      <div class="flex gap-2">
        <button
          class="btn btn-ghost btn-sm gap-2 rounded-lg text-[#596579]"
          onclick={() => window.print()}
          ><Printer size={15} />Print receipt</button
        ><a
          href="/app"
          class="btn btn-ghost btn-sm gap-2 rounded-lg text-[#596579]"
          ><ArrowLeft size={15} />Open app</a
        >
      </div>
    </div>

    {#if error}
      <div
        class="mt-12 rounded-xl border border-[#ecd0d0] bg-white p-10 text-center"
      >
        <h1 class="text-lg font-semibold">Receipt unavailable</h1>
        <p class="mt-2 text-sm text-[#7f8a9d]">{error}</p>
      </div>
    {:else if !request}
      <div
        class="mt-12 rounded-xl border border-[#e0e6ef] bg-white p-10 text-center"
      >
        <span class="loading loading-spinner text-[#2454d6]"></span>
      </div>
    {:else}
      <article
        class="mt-8 overflow-hidden rounded-xl border border-[#e0e6ef] bg-white shadow-[0_14px_40px_rgba(23,34,56,0.035)] print:mt-0 print:border-0 print:shadow-none"
      >
        <div class="border-b border-[#e4e9f1] px-6 py-7 sm:px-10">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div
                class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] {receiptStatus ===
                'Open'
                  ? 'text-[#8994a6]'
                  : 'text-[#2b8c67]'}"
              >
                <CheckCircle2 size={15} />{receiptStatus === 'Open'
                  ? 'No verified payment yet'
                  : 'Verified settlement record'}
              </div>
              <h1
                class="mt-4 text-2xl font-semibold tracking-[-0.015em] text-[#172238]"
              >
                Settlement receipt
              </h1>
              <p class="mt-2 text-sm text-[#7f8a9d]">
                A public record of verified USDC transfers on Arc.
              </p>
            </div>
            <div
              class="hidden h-11 w-11 place-items-center rounded-xl bg-[#eaf8f1] text-[#2b8c67] sm:grid"
            >
              <FileCheck2 size={21} />
            </div>
          </div>
        </div>
        <div
          class="grid min-w-0 gap-0 border-b border-[#e4e9f1] sm:grid-cols-[minmax(0,1fr)_minmax(220px,1fr)]"
        >
          <div
            class="min-w-0 border-b border-[#edf0f5] px-6 py-5 sm:border-b-0 sm:border-r sm:px-10"
          >
            <div class="text-xs text-[#8994a6]">Payment reference</div>
            <div
              class="mt-2 max-w-full break-all font-mono text-xs leading-5 text-[#33415b]"
            >
              {request.token}
            </div>
            <div class="mt-1 text-[11px] text-[#9aa4b5]">
              Public reference only
            </div>
          </div>
          <div class="min-w-0 px-6 py-5 sm:px-10">
            <div class="text-xs text-[#8994a6]">Total settled</div>
            <div
              class="mono-numbers mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-2xl font-semibold tracking-[-0.015em] text-[#172238]"
            >
              ${formatUsdcBaseUnits(request.paidMicroUsdc)}
              <span class="text-sm font-medium text-[#8994a6]">USDC</span>
            </div>
            <div class="mt-1 text-[11px] text-[#2b8c67]">
              {receiptStatus === 'Paid'
                ? 'Fully paid'
                : receiptStatus === 'Overpaid'
                  ? 'Overpaid'
                  : receiptStatus === 'Partially paid'
                    ? 'Partial settlement'
                    : 'No verified payment yet'}
            </div>
          </div>
        </div>
        <div class="px-6 py-6 sm:px-10">
          <h2 class="text-sm font-semibold text-[#33415b]">
            Verified transfers
          </h2>
          <div class="mt-4 overflow-hidden rounded-lg border border-[#e3e8f0]">
            <div
              class="hidden grid-cols-[1fr_130px_150px_24px] gap-4 border-b border-[#edf0f5] bg-[#fbfcfe] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#929cad] sm:grid"
            >
              <div>Payer</div>
              <div>Amount</div>
              <div>Received</div>
              <div></div>
            </div>
            {#each request.payments as payment}
              <a
                href={payment.explorerUrl}
                target="_blank"
                rel="noreferrer"
                class="grid grid-cols-1 gap-2 border-b border-[#edf0f5] px-4 py-4 last:border-b-0 hover:bg-[#fbfcfe] sm:grid-cols-[1fr_130px_150px_24px] sm:items-center sm:gap-4"
                ><div>
                  <div class="font-mono text-xs text-[#596579]">
                    {shortenAddress(payment.payer, 10, 8)}
                  </div>
                  <div class="mt-1 font-mono text-[10px] text-[#9aa4b5]">
                    {shortenAddress(payment.transactionHash, 10, 8)}
                  </div>
                </div>
                <div class="mono-numbers text-sm font-semibold text-[#33415b]">
                  ${formatUsdcBaseUnits(payment.amountMicroUsdc ?? '0')}
                </div>
                <div class="text-xs text-[#7f8a9d]">
                  {formatDate(payment.receivedAt)}
                </div>
                <ExternalLink
                  size={14}
                  class="hidden text-[#8994a6] sm:block"
                /></a
              >
            {/each}
          </div>
        </div>
        <div
          class="flex flex-col gap-2 border-t border-[#e4e9f1] bg-[#fbfcfe] px-6 py-5 text-[11px] text-[#8994a6] sm:flex-row sm:items-center sm:justify-between sm:px-10"
        >
          <span>Arc · Verified by MemoMatch</span><span class="font-mono"
            >{request.memoId.slice(0, 18)}…</span
          >
        </div>
      </article>
    {/if}
  </div>
</div>
