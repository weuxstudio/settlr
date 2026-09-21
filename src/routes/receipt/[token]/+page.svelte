<script lang="ts">
  import { onMount } from 'svelte';
  import {
    ArrowLeft,
    CircleAlert,
    CheckCircle2,
    ExternalLink,
    FileCheck2,
    LoaderCircle,
    Printer
  } from 'lucide-svelte';
  import { formatDate, formatUsdcBaseUnits } from '$lib/format';
  import { ARC_ENVIRONMENT, shortenAddress } from '$lib/config';
  import NetworkBadge from '$lib/components/NetworkBadge.svelte';
  import Brand from '$lib/components/Brand.svelte';
  import type { PaymentRequest, PaymentStatus } from '$lib/types';

  type PublicReceipt = {
    token: string;
    amountMicroUsdc: string;
    paidMicroUsdc: string;
    remainingMicroUsdc: string;
    overpaidMicroUsdc: string;
    status: PaymentStatus;
    memoId: string;
    network?: string;
    chainId?: number;
    payments: PaymentRequest['payments'];
  };
  let request: PublicReceipt | null = null;
  let error = '';
  let loading = true;
  $: receiptStatus = request ? getStatus(request) : 'Open';

  function getStatus(item: PublicReceipt): PaymentStatus {
    return item.status;
  }

  onMount(async () => {
    const token = window.location.pathname.split('/').pop();
    try {
      const response = await fetch(`/api/receipts/${token}`, {
        cache: 'no-store'
      });
      if (!response.ok) {
        error =
          response.status === 404
            ? 'This receipt does not exist or is not public.'
            : 'The receipt service is temporarily unavailable.';
        return;
      }
      const payload = (await response.json()) as { request?: PublicReceipt };
      if (!payload.request) throw new Error('Missing receipt data.');
      request = payload.request;
    } catch {
      error = 'The receipt could not be loaded. Please try again.';
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head><title>Payment receipt | Settlr</title></svelte:head>

<div
  class="receipt-page min-h-screen bg-[#f8f8f5] px-5 py-8 text-[#172238] print:bg-white sm:py-12"
  data-page="receipt"
>
  <div class="mx-auto max-w-[760px]">
    <div class="flex items-center justify-between print:hidden">
      <Brand />
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
      <div class="app-surface mt-12 p-10 text-center">
        <CircleAlert size={26} class="mx-auto text-[#a44d4d]" />
        <h1 class="mt-4 text-lg font-semibold">Receipt unavailable</h1>
        <p class="mt-2 text-sm text-[#7f8a9d]">{error}</p>
        <a href="/" class="btn btn-primary mt-6 h-11 rounded-lg px-5"
          >Back to Settlr</a
        >
      </div>
    {:else if loading}
      <div
        class="app-surface mt-12 p-10 text-center"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle size={24} class="mx-auto animate-spin text-[#2454d6]" />
        <p class="mt-3 text-sm text-[#596579]">Loading verified receipt…</p>
      </div>
    {:else if !request}
      <div class="app-surface mt-12 p-10 text-center">
        <CircleAlert size={26} class="mx-auto text-[#a44d4d]" />
        <h1 class="mt-4 text-lg font-semibold">Receipt unavailable</h1>
        <p class="mt-2 text-sm text-[#7f8a9d]">
          No public receipt data was returned.
        </p>
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
                {#if receiptStatus === 'Open'}<CircleAlert
                    size={15}
                  />{:else}<CheckCircle2 size={15} />{/if}{receiptStatus ===
                'Open'
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
            <div class="text-xs text-[#8994a6]">Settlement summary</div>
            <div class="mt-3 grid grid-cols-1 gap-3 xs:grid-cols-3">
              <div>
                <div class="text-[11px] text-[#9aa4b5]">Requested</div>
                <div
                  class="mono-numbers mt-1 text-base font-semibold text-[#172238]"
                >
                  {formatUsdcBaseUnits(request.amountMicroUsdc)}
                  <span class="text-xs font-medium text-[#8994a6]">USDC</span>
                </div>
              </div>
              <div>
                <div class="text-[11px] text-[#9aa4b5]">Received</div>
                <div
                  class="mono-numbers mt-1 text-base font-semibold text-[#172238]"
                >
                  {formatUsdcBaseUnits(request.paidMicroUsdc)}
                  <span class="text-xs font-medium text-[#8994a6]">USDC</span>
                </div>
              </div>
              <div>
                <div class="text-[11px] text-[#9aa4b5]">
                  {BigInt(request.overpaidMicroUsdc) > 0n
                    ? 'Overpaid'
                    : 'Remaining'}
                </div>
                <div
                  class="mono-numbers mt-1 text-base font-semibold text-[#172238]"
                >
                  {formatUsdcBaseUnits(
                    BigInt(request.overpaidMicroUsdc) > 0n
                      ? request.overpaidMicroUsdc
                      : request.remainingMicroUsdc
                  )}
                  <span class="text-xs font-medium text-[#8994a6]">USDC</span>
                </div>
              </div>
            </div>
            <div class="mt-3 text-[11px] text-[#2b8c67]">
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
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-sm font-semibold text-[#33415b]">
              Verified transfers
            </h2>
            <NetworkBadge network={request.network ?? ARC_ENVIRONMENT} compact />
          </div>
          <div class="mt-4 overflow-hidden rounded-lg border border-[#e3e8f0]">
            <div
              class="hidden grid-cols-[1fr_130px_150px_24px] gap-4 border-b border-[#edf0f5] bg-[#fbfcfe] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#929cad] sm:grid"
            >
              <div>Payer</div>
              <div>Amount</div>
              <div>Received</div>
              <div></div>
            </div>
            {#if request.payments.length === 0}
              <div class="px-4 py-8 text-center text-sm text-[#7f8a9d]">
                No verified transfers have been recorded yet.
              </div>
            {:else}
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
                  <div
                    class="mono-numbers text-sm font-semibold text-[#33415b]"
                  >
                    {formatUsdcBaseUnits(payment.amountMicroUsdc ?? '0')}
                    <span class="text-xs font-medium text-[#8994a6]">USDC</span>
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
            {/if}
          </div>
        </div>
        <div
          class="flex flex-col gap-2 border-t border-[#e4e9f1] bg-[#fbfcfe] px-6 py-5 text-[11px] text-[#8994a6] sm:flex-row sm:items-center sm:justify-between sm:px-10"
        >
          <span>Arc · Verified by Settlr</span><span class="font-mono"
            >{request.memoId.slice(0, 18)}…</span
          >
        </div>
      </article>
    {/if}
  </div>
</div>
