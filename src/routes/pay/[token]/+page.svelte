<script lang="ts">
  import { onMount } from 'svelte';
  import {
    ArrowLeft,
    CheckCircle2,
    Clipboard,
    ExternalLink,
    LoaderCircle,
    ShieldCheck,
    Wallet,
    XCircle
  } from 'lucide-svelte';
  import { formatUsdcBaseUnits, parseUsdc } from '$lib/format';
  import { ARC_EXPLORER_URL, shortenAddress } from '$lib/config';
  import {
    connectWallet,
    sendMemoPayment,
    switchWalletAccount
  } from '$lib/client/wallet';

  type PublicRequest = {
    token: string;
    memoId: string;
    amountMicroUsdc: string;
    paidMicroUsdc: string;
    remainingMicroUsdc: string;
    overpaidMicroUsdc: string;
    recipient: string;
    status: 'Open' | 'Partially paid' | 'Paid' | 'Overpaid';
    closedAt?: string;
    network: string;
    paymentsEnabled: boolean;
  };

  let request: PublicRequest | null = null;
  let loading = true;
  let error = '';
  let amount = '';
  let wallet = '';
  let transactionHash = '';
  let isSending = false;
  let isRecipientOwner = false;
  let message = '';
  let verificationState:
    'idle' | 'pending' | 'delayed' | 'verified' | 'rejected' = 'idle';

  type StoredPayment = {
    transactionHash: string;
    token: string;
    network: string;
  };

  function paymentStorageKey(token: string, network: string) {
    return `memomatch:pending-payment:${network}:${token}`;
  }

  function storePendingPayment(value: StoredPayment) {
    try {
      localStorage.setItem(
        paymentStorageKey(value.token, value.network),
        JSON.stringify(value)
      );
    } catch {
      // The server-side attempt remains authoritative when storage is blocked.
    }
  }

  function readPendingPayment(token: string, network: string) {
    try {
      const value = JSON.parse(
        localStorage.getItem(paymentStorageKey(token, network)) ?? 'null'
      ) as Partial<StoredPayment> | null;
      if (
        value?.token === token &&
        value.network === network &&
        typeof value.transactionHash === 'string' &&
        /^0x[a-fA-F0-9]{64}$/.test(value.transactionHash)
      ) {
        return value as StoredPayment;
      }
    } catch {
      // Ignore malformed local state and continue with the public request.
    }
    return undefined;
  }

  function clearPendingPayment(value: StoredPayment) {
    try {
      localStorage.removeItem(paymentStorageKey(value.token, value.network));
    } catch {
      // Ignore storage restrictions after the server has finalized the attempt.
    }
  }

  onMount(async () => {
    const token = window.location.pathname.split('/').pop();
    try {
      const response = await fetch(`/api/pay/${token}`);
      if (!response.ok) throw new Error('This payment link is not available.');
      const payload = await response.json();
      const loaded = payload.request as PublicRequest;
      request = loaded;
      amount = formatUsdcBaseUnits(BigInt(loaded.remainingMicroUsdc));
      const sessionResponse = await fetch('/api/auth/session', {
        cache: 'no-store'
      });
      if (sessionResponse.ok) {
        const session = (await sessionResponse.json()) as {
          authenticated?: boolean;
          address?: string;
        };
        isRecipientOwner = Boolean(
          session.authenticated &&
          session.address?.toLowerCase() === loaded.recipient.toLowerCase()
        );
      }
      const pending = readPendingPayment(loaded.token, loaded.network);
      if (
        pending &&
        loaded.status !== 'Open' &&
        BigInt(loaded.remainingMicroUsdc) === 0n
      ) {
        clearPendingPayment(pending);
      } else if (pending) {
        transactionHash = pending.transactionHash;
        isSending = true;
        void registerAndPoll(pending.transactionHash).finally(
          () => (isSending = false)
        );
      }
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause.message
          : 'This payment link is not available.';
    } finally {
      loading = false;
    }
  });

  $: remaining = request ? BigInt(request.remainingMicroUsdc) : 0n;
  $: isClosed =
    Boolean(request?.closedAt) ||
    request?.status === 'Paid' ||
    request?.status === 'Overpaid' ||
    remaining === 0n;

  async function refreshRequest() {
    if (!request) return;
    const response = await fetch(`/api/pay/${request.token}`, {
      cache: 'no-store'
    });
    if (!response.ok) return;
    request = (await response.json()).request as PublicRequest;
    amount = formatUsdcBaseUnits(BigInt(request.remainingMicroUsdc));
  }

  async function pollVerification(hash: string) {
    verificationState = 'pending';
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await fetch(
        `/api/pay/${request?.token}/attempts/${hash}`,
        { cache: 'no-store' }
      );
      const result = (await response.json().catch(() => ({}))) as {
        status?: 'pending' | 'delayed' | 'verified' | 'rejected';
        message?: string;
      };
      if (result.status === 'verified') {
        verificationState = 'verified';
        await refreshRequest();
        if (request)
          clearPendingPayment({
            transactionHash: hash,
            token: request.token,
            network: request.network
          });
        message = 'Payment verified on Arc.';
        return;
      }
      if (result.status === 'rejected') {
        verificationState = 'rejected';
        if (request)
          clearPendingPayment({
            transactionHash: hash,
            token: request.token,
            network: request.network
          });
        message = result.message ?? 'The transaction could not be verified.';
        return;
      }
      if (result.status === 'delayed') verificationState = 'delayed';
      await new Promise((resolve) =>
        setTimeout(resolve, attempt < 10 ? 3000 : 10000)
      );
    }
    verificationState = 'delayed';
    message =
      'Arc is taking longer than usual to confirm this payment. The receipt will update automatically.';
  }

  async function registerAndPoll(hash: string) {
    if (!request || !request.paymentsEnabled) return;
    try {
      const verifyResponse = await fetch(`/api/pay/${request.token}/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transactionHash: hash })
      });
      if (verifyResponse.status === 202) {
        await pollVerification(hash);
        return;
      }
      if (verifyResponse.ok) {
        verificationState = 'verified';
        clearPendingPayment({
          transactionHash: hash,
          token: request.token,
          network: request.network
        });
        await refreshRequest();
        message = 'Payment verified on Arc.';
        return;
      }
      verificationState = 'rejected';
      clearPendingPayment({
        transactionHash: hash,
        token: request.token,
        network: request.network
      });
      const rejection = (await verifyResponse.json().catch(() => ({}))) as {
        message?: string;
      };
      message =
        rejection.message ??
        'The transaction could not be matched to this payment request.';
    } catch {
      verificationState = 'delayed';
      message =
        'Arc is taking longer than usual to confirm this payment. The receipt will update automatically.';
    }
  }

  async function handlePay() {
    if (!request || !amount) return;
    let paymentAmount = 0n;
    try {
      paymentAmount = parseUsdc(amount.replaceAll(',', ''));
    } catch {
      return;
    }
    if (paymentAmount <= 0n || paymentAmount > remaining) return;
    if (!request.paymentsEnabled) {
      message = 'Payments are disabled in this environment.';
      return;
    }

    isSending = true;
    verificationState = 'pending';
    transactionHash = '';
    message = '';
    try {
      wallet = wallet || (await connectWallet());
      transactionHash = await sendMemoPayment(
        request.recipient as `0x${string}`,
        paymentAmount,
        request.memoId as `0x${string}`
      );
      storePendingPayment({
        transactionHash,
        token: request.token,
        network: request.network
      });
      message =
        'Transaction submitted. MemoMatch is checking the final Arc receipt.';
      await registerAndPoll(transactionHash);
    } catch (cause) {
      verificationState = transactionHash ? 'delayed' : 'idle';
      message =
        cause instanceof Error
          ? cause.message
          : 'The payment could not be submitted.';
    } finally {
      isSending = false;
    }
  }

  async function handleSwitchWallet() {
    try {
      wallet = await switchWalletAccount();
      transactionHash = '';
      verificationState = 'idle';
      message = 'Wallet account switched. Review the payment before continuing.';
    } catch (cause) {
      message =
        cause instanceof Error
          ? cause.message
          : 'Wallet account switch failed.';
    }
  }

  async function copyRecipient() {
    if (!request) return;
    await navigator.clipboard?.writeText(request.recipient);
    message = 'Recipient address copied.';
  }
</script>

<svelte:head>
  <title>Pay securely on Arc | MemoMatch</title>
</svelte:head>

<div class="min-h-screen bg-[#f6f8fb] px-5 py-8 text-[#172238] sm:py-12">
  <div class="mx-auto max-w-[760px]">
    <div class="flex items-center justify-between">
      <a href="/" class="flex items-center gap-2.5 text-sm font-semibold">
        <span
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
        >
        MemoMatch
      </a>
      {#if isRecipientOwner}
        <a
          href="/#requests"
          class="btn btn-ghost btn-sm gap-2 rounded-lg text-[#596579]"
          ><ArrowLeft size={15} />Manage request</a
        >
      {/if}
    </div>

    {#if loading}
      <div
        class="mt-12 rounded-xl border border-[#e0e6ef] bg-white p-10 text-center"
      >
        <span class="loading loading-spinner text-[#2454d6]"></span>
        <p class="mt-3 text-sm text-[#7f8a9d]">Loading payment details…</p>
      </div>
    {:else if error}
      <div
        class="mt-12 rounded-xl border border-[#ecd0d0] bg-white p-10 text-center"
      >
        <XCircle size={28} class="mx-auto text-[#b95757]" />
        <h1 class="mt-4 text-lg font-semibold">Payment link unavailable</h1>
        <p class="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#7f8a9d]">
          {error}
        </p>
      </div>
    {:else if request}
      <div class="mt-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section
          class="rounded-xl border border-[#e0e6ef] bg-white p-6 shadow-[0_14px_40px_rgba(23,34,56,0.035)] sm:p-8"
        >
          <div
            class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#2454d6]"
          >
            <ShieldCheck size={15} />Verified Arc payment reference
          </div>
          <h1
            class="mt-7 max-w-md text-[clamp(1.9rem,4vw,2.7rem)] font-semibold leading-[1.08] tracking-[-0.018em]"
          >
            Pay this request with USDC.
          </h1>
          <p class="mt-4 max-w-md text-sm leading-6 text-[#596b87]">
            Your payment goes directly to the recipient on Arc. The reference
            and receipt stay visible after settlement.
          </p>
          <div class="mt-10 border-t border-[#edf0f5] pt-6">
            <div class="text-xs text-[#8994a6]">Amount due</div>
            <div
              class="mono-numbers mt-2 text-4xl font-semibold tracking-[-0.02em] text-[#172238]"
            >
              {formatUsdcBaseUnits(remaining)}<span
                class="ml-2 text-base font-medium tracking-normal text-[#8994a6]"
                >USDC</span
              >
            </div>
            <div class="mt-3 flex items-center gap-2 text-xs text-[#257b5d]">
              <span class="h-1.5 w-1.5 rounded-full bg-current"></span>Arc {request.network}
              · final after block confirmation
            </div>
          </div>
        </section>

        <section
          class="rounded-xl border border-[#e0e6ef] bg-white p-6 shadow-[0_14px_40px_rgba(23,34,56,0.035)] sm:p-8"
        >
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-[#33415b]">
              Payment details
            </h2>
            <span
              class="rounded-full bg-[#eff3fa] px-2.5 py-1 text-[10px] font-semibold text-[#6f7e95]"
              >USDC</span
            >
          </div>
          <div class="mt-6 space-y-5">
            <div>
              <div class="text-xs text-[#8994a6]">Recipient</div>
              <div
                class="mt-2 flex items-center gap-2 rounded-lg border border-[#e1e6ee] bg-[#fbfcfe] px-3 py-3"
              >
                <span
                  class="min-w-0 flex-1 truncate font-mono text-xs text-[#596579]"
                  >{shortenAddress(request.recipient, 10, 8)}</span
                ><button
                  class="btn btn-ghost h-11 min-h-11 w-11 rounded-md text-[#2454d6]"
                  aria-label="Copy recipient"
                  onclick={copyRecipient}><Clipboard size={14} /></button
                >
              </div>
            </div>
            <div>
              <div class="flex items-center justify-between gap-3">
                <label
                  for="payment-amount"
                  class="text-xs font-medium text-[#596b87]"
                  >Amount to pay</label
                >
                <button
                  type="button"
                  class="text-[11px] font-semibold text-[#2454d6] hover:underline"
                  disabled={isClosed}
                  onclick={() => (amount = formatUsdcBaseUnits(remaining))}
                  >Use full amount</button
                >
              </div>
              <div class="relative mt-2">
                <input
                  id="payment-amount"
                  bind:value={amount}
                  class="input mono-numbers h-12 w-full rounded-lg border-[#cbd5e1] bg-[#f8fafc] pr-16 text-base text-[#172238] shadow-none focus:border-[#2454d6] focus:bg-white"
                  inputmode="decimal"
                  aria-describedby="payment-amount-help"
                  disabled={isClosed}
                /><span
                  class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-[#8994a6]"
                  >USDC</span
                >
              </div>
              <span
                id="payment-amount-help"
                class="mt-2 block text-[11px] text-[#6f7e95]"
                >You can pay in parts. Maximum for this request: {formatUsdcBaseUnits(
                  remaining
                )} USDC</span
              >
            </div>
          </div>
          {#if !request.paymentsEnabled}
            <div
              class="mt-6 rounded-lg border border-[#ecd9ad] bg-[#fff9eb] px-3.5 py-3 text-xs leading-5 text-[#7a5a13]"
              role="status"
            >
              Payments are disabled in this environment. This request can be
              reviewed, but no wallet transaction can be submitted.
            </div>
          {/if}
          <button
            class="btn btn-primary mt-6 h-12 w-full rounded-lg shadow-[0_9px_24px_rgba(36,84,214,0.18)]"
            disabled={isClosed ||
              isSending ||
              verificationState === 'pending' ||
              verificationState === 'delayed' ||
              !amount ||
              !request.paymentsEnabled}
            onclick={handlePay}
          >
            {#if isSending}<LoaderCircle
                size={17}
                class="animate-spin"
              />Checking wallet…{:else if isClosed}<CheckCircle2
                size={17}
              />Request settled{:else if !request.paymentsEnabled}<Wallet
                size={17}
                />Payments unavailable{:else}<Wallet size={17} />Pay with wallet{/if}
          </button>
          <button
            class="btn btn-ghost mt-2 h-10 w-full rounded-lg text-xs text-[#596b87]"
            type="button"
            disabled={isSending || isClosed || !request.paymentsEnabled}
            onclick={handleSwitchWallet}
            >Switch wallet account</button
          >
          {#if message}
            <div
              class="mt-4 rounded-lg border border-[#dce5f5] bg-[#f3f7ff] px-3 py-3 text-xs leading-5 text-[#536786]"
            >
              {message}{#if transactionHash}<a
                  class="mt-1 flex items-center gap-1 font-mono text-[10px] text-[#2454d6]"
                  href={`${ARC_EXPLORER_URL}/tx/${transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                  >{shortenAddress(transactionHash, 12, 8)}<ExternalLink
                    size={12}
                  /></a
                >{/if}
            </div>
          {/if}
          <div
            class="mt-6 flex items-start gap-2 text-[11px] leading-5 text-[#6f7e95]"
          >
            <ShieldCheck size={15} class="mt-0.5 shrink-0 text-[#2b8c67]" />No
            funds are held by MemoMatch. Your wallet sends USDC directly to the
            recipient.
          </div>
        </section>
      </div>
    {/if}

    <div class="mt-7 text-center text-[11px] text-[#6f7e95]">
      Powered by MemoMatch · Arc {request?.network ?? 'testnet'} ·
      <a
        href="/docs"
        class="text-[#6f7e95] underline decoration-[#cbd5e5] underline-offset-2"
        >How it works</a
      >
    </div>
  </div>
</div>
