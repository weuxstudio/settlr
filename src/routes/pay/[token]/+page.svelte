<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { animate, createScope } from 'animejs';
  import {
    ArrowLeft,
    BadgeCheck,
    CheckCircle2,
    ChevronDown,
    CircleAlert,
    CircleCheck,
    Copy,
    Clock3,
    ExternalLink,
    Info,
    LoaderCircle,
    ReceiptText,
    ShieldCheck,
    UserRound,
    Wallet,
    XCircle
  } from 'lucide-svelte';
  import { formatDate, formatUsdcBaseUnits, parseUsdc } from '$lib/format';
  import { ARC_ENVIRONMENT, ARC_EXPLORER_URL, shortenAddress } from '$lib/config';
  import NetworkBadge from '$lib/components/NetworkBadge.svelte';
  import StatusChip from '$lib/components/StatusChip.svelte';
  import Brand from '$lib/components/Brand.svelte';
  import {
    connectWallet,
    inspectMemoPayment,
    sendMemoPayment,
    switchWalletAccount,
    type PaymentWalletPreview
  } from '$lib/client/wallet';

  type PublicRequest = {
    token: string;
    memoId: string;
    publicDescription: string;
    requesterName: string;
    publicReference: string;
    dueDate?: string;
    createdAt: string;
    amountMicroUsdc: string;
    paidMicroUsdc: string;
    remainingMicroUsdc: string;
    overpaidMicroUsdc: string;
    recipient: string;
    status: 'Open' | 'Partially paid' | 'Paid' | 'Overpaid';
    closedAt?: string;
    network: string;
    paymentsEnabled: boolean;
    payments: Array<{
      amountMicroUsdc: string;
      payer: string;
      transactionHash: string;
      blockNumber: number;
      receivedAt: string;
      explorerUrl: string;
      verification: 'verified' | 'pending' | 'delayed' | 'rejected';
    }>;
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
  let showFullReference = false;
  let allowPartialPayment = false;
  let isCheckingWallet = false;
  let walletPreview: PaymentWalletPreview | null = null;
  let scopeRoot: HTMLDivElement;
  let motionScope: ReturnType<typeof createScope> | undefined;
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

  async function fetchWithTimeout(
    input: RequestInfo | URL,
    init?: RequestInit,
    timeoutMs = 10_000
  ) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      window.clearTimeout(timeout);
    }
  }

  onMount(() => {
    let disposed = false;
    const provider = window.ethereum as
      | (typeof window.ethereum & {
          on?: (event: string, handler: (value: unknown) => void) => void;
          removeListener?: (
            event: string,
            handler: (value: unknown) => void
          ) => void;
        })
      | undefined;
    const resetWallet = () => {
      wallet = '';
      walletPreview = null;
      message = 'Wallet account changed. Reconnect to review the payment.';
      void animateState('[data-status-message]');
    };

    void (async () => {
      const token = window.location.pathname.split('/').pop();
      try {
        const response = await fetch(`/api/pay/${token}`);
        if (!response.ok)
          throw new Error('This payment link is not available.');
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
          void registerAndPoll(pending.transactionHash);
        }
      } catch (cause) {
        error =
          cause instanceof Error
            ? cause.message
            : 'This payment link is not available.';
      } finally {
        loading = false;
        await tick();
        if (!disposed) setupMotion();
      }
    })();

    provider?.on?.('accountsChanged', resetWallet);
    provider?.on?.('chainChanged', resetWallet);
    return () => {
      disposed = true;
      motionScope?.revert();
      provider?.removeListener?.('accountsChanged', resetWallet);
      provider?.removeListener?.('chainChanged', resetWallet);
    };
  });

  function setupMotion() {
    motionScope?.revert();
    motionScope = createScope({
      root: scopeRoot,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' }
    }).add((self) => {
      if (self?.matches.reduceMotion) return;
      animate('[data-enter="header"]', {
        opacity: [0, 1],
        translateY: [8, 0],
        duration: 320,
        ease: 'out(3)'
      });
      animate('[data-enter="summary"]', {
        opacity: [0, 1],
        translateY: [12, 0],
        duration: 380,
        delay: 70,
        ease: 'out(3)'
      });
      animate('[data-enter="payment"]', {
        opacity: [0, 1],
        translateY: [14, 0],
        duration: 420,
        delay: 130,
        ease: 'out(3)'
      });
    });
  }

  async function animateState(selector: string) {
    await tick();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = scopeRoot?.querySelector(selector);
    if (!target) return;
    animate(target, {
      opacity: [0, 1],
      translateY: [6, 0],
      duration: 220,
      ease: 'out(3)'
    });
  }

  function animateDisclosure(event: Event) {
    const details = event.currentTarget as HTMLDetailsElement;
    if (!details.open) return;
    const body = details.querySelector('[data-disclosure-body]');
    if (!body || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return;
    animate(body, {
      opacity: [0, 1],
      translateY: [-5, 0],
      duration: 180,
      ease: 'out(3)'
    });
  }

  $: remaining = request ? BigInt(request.remainingMicroUsdc) : 0n;
  $: parsedAmount = (() => {
    try {
      return amount ? parseUsdc(amount.replaceAll(',', '')) : 0n;
    } catch {
      return -1n;
    }
  })();
  $: amountError =
    parsedAmount < 0n
      ? 'Enter a valid USDC amount with up to six decimals.'
      : parsedAmount === 0n
        ? 'Enter an amount greater than zero.'
        : parsedAmount > remaining
          ? `Enter no more than ${formatUsdcBaseUnits(remaining)} USDC.`
          : '';
  $: isSettled =
    request?.status === 'Paid' ||
    request?.status === 'Overpaid' ||
    remaining === 0n;
  $: isClosedLink = Boolean(request?.closedAt);
  $: paymentUnavailable = isClosedLink || isSettled;
  $: estimatedFee = BigInt(walletPreview?.estimatedFeeMicroUsdc ?? '0');
  $: estimatedTotal = parsedAmount > 0n ? parsedAmount + estimatedFee : 0n;

  function formatFee(value: bigint) {
    if (value === 0n) return 'Calculated before payment';
    if (value < 10_000n) return '< 0.01 USDC';
    return `${formatUsdcBaseUnits(value)} USDC`;
  }

  function formatDueDate(value?: string) {
    if (!value) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(`${value}T00:00:00`));
  }

  function requesterInitial(value?: string) {
    return value?.trim().charAt(0).toUpperCase() || 'W';
  }

  async function prepareWallet(address?: string) {
    if (!request || parsedAmount <= 0n || amountError) return;
    isCheckingWallet = true;
    message = '';
    try {
      wallet = address || (await connectWallet());
      walletPreview = await inspectMemoPayment(
        request.recipient as `0x${string}`,
        parsedAmount,
        request.memoId as `0x${string}`
      );
      wallet = walletPreview.address;
      if (!walletPreview.hasSufficientBalance) {
        message =
          'This wallet does not have enough USDC for the payment and network fee.';
      }
      await animateState('[data-wallet-state]');
      if (message) await animateState('[data-status-message]');
    } catch (cause) {
      wallet = '';
      walletPreview = null;
      message = cause instanceof Error ? cause.message : 'Wallet check failed.';
      await animateState('[data-status-message]');
    } finally {
      isCheckingWallet = false;
    }
  }

  async function togglePartialPayment() {
    allowPartialPayment = !allowPartialPayment;
    if (!allowPartialPayment) {
      amount = formatUsdcBaseUnits(remaining);
      if (wallet) await prepareWallet(wallet);
    }
    await animateState('[data-amount-control]');
  }

  async function refreshRequest(expectedHash?: string) {
    if (!request) return false;
    const response = await fetchWithTimeout(
      `/api/pay/${request.token}`,
      { cache: 'no-store' },
      8_000
    );
    if (!response.ok) return false;
    const updated = (await response.json()).request as PublicRequest;
    request = updated;
    amount = formatUsdcBaseUnits(BigInt(updated.remainingMicroUsdc));
    return expectedHash
      ? updated.payments.some(
          (payment) =>
            payment.transactionHash.toLowerCase() === expectedHash.toLowerCase()
        )
      : false;
  }

  async function finishVerification(hash: string, refresh = true) {
    verificationState = 'verified';
    if (refresh) await refreshRequest();
    if (request) {
      clearPendingPayment({
        transactionHash: hash,
        token: request.token,
        network: request.network
      });
    }
    message = 'Payment verified on Arc.';
    await animateState('[data-payment-card]');
  }

  async function pollVerification(hash: string) {
    verificationState = 'pending';
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        if (await refreshRequest(hash)) {
          await finishVerification(hash, false);
          return;
        }
        const response = await fetchWithTimeout(
          `/api/pay/${request?.token}/attempts/${hash}`,
          { cache: 'no-store' },
          8_000
        );
        const result = (await response.json().catch(() => ({}))) as {
          status?: 'pending' | 'delayed' | 'verified' | 'rejected';
          message?: string;
        };
        if (result.status === 'verified') {
          await finishVerification(hash);
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
        if (result.status === 'delayed' || attempt >= 4) {
          verificationState = 'delayed';
          message =
            'Verification is taking longer than usual. This page keeps checking automatically.';
        }
      } catch {
        verificationState = 'delayed';
        message =
          'Verification is taking longer than usual. This page keeps checking automatically.';
      }
      await new Promise((resolve) =>
        setTimeout(resolve, attempt < 20 ? 3000 : 10000)
      );
    }
    verificationState = 'delayed';
    message =
      'Arc is taking longer than usual to confirm this payment. The receipt will update automatically.';
  }

  async function registerAndPoll(hash: string) {
    if (!request || !request.paymentsEnabled) return;
    verificationState = 'pending';
    try {
      const verifyResponse = await fetchWithTimeout(
        `/api/pay/${request.token}/verify`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ transactionHash: hash })
        },
        12_000
      );
      if (verifyResponse.status === 202) {
        await pollVerification(hash);
        return;
      }
      if (verifyResponse.ok) {
        await finishVerification(hash);
        return;
      }
      if (verifyResponse.status !== 422) {
        verificationState = 'delayed';
        await pollVerification(hash);
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
        'Verification is taking longer than usual. This page keeps checking automatically.';
      await pollVerification(hash);
    }
  }

  async function handlePay() {
    if (!request || !amount) return;
    let paymentAmount = 0n;
    try {
      paymentAmount = parseUsdc(amount.replaceAll(',', ''));
    } catch {
      message = 'Enter a valid USDC amount with up to six decimals.';
      return;
    }
    if (paymentAmount <= 0n) {
      message = 'Enter an amount greater than zero.';
      return;
    }
    if (paymentAmount > remaining) {
      message = `Enter no more than ${formatUsdcBaseUnits(remaining)} USDC.`;
      return;
    }
    if (!request.paymentsEnabled) {
      message = 'Payments are disabled in this environment.';
      return;
    }
    if (!walletPreview) {
      await prepareWallet();
      return;
    }
    if (!walletPreview.hasSufficientBalance) {
      message =
        'This wallet does not have enough USDC for the payment and network fee.';
      await animateState('[data-status-message]');
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
        'Transaction submitted. Settlr is checking the final Arc receipt.';
      isSending = false;
      void registerAndPoll(transactionHash);
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
      await prepareWallet(wallet);
      transactionHash = '';
      verificationState = 'idle';
      message =
        'Wallet account switched. Review the payment before continuing.';
      await animateState('[data-wallet-state]');
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

  async function copyReference() {
    if (!request) return;
    await navigator.clipboard?.writeText(request.token);
    message = 'Payment reference copied.';
  }
</script>

<svelte:head>
  <title>
    {request?.publicDescription || 'Payment request'} | Settlr
  </title>
</svelte:head>

<div
  bind:this={scopeRoot}
  class="payment-page min-h-screen bg-[#f8f8f5] px-4 py-6 text-[#172238] sm:px-6 sm:py-10"
  data-page="payment"
>
  <div class="mx-auto max-w-[1080px]">
    <header class="flex items-center justify-between gap-4">
      <Brand />
      <div class="flex items-center gap-2">
        <NetworkBadge network={request?.network ?? ARC_ENVIRONMENT} compact />
        {#if isRecipientOwner}
          <a
            href="/app#requests"
            class="btn btn-ghost btn-sm gap-2 rounded-lg text-[#596579]"
            ><ArrowLeft size={15} />Manage request</a
          >
        {/if}
      </div>
    </header>

    {#if loading}
      <div
        class="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]"
        role="status"
        aria-live="polite"
        aria-label="Loading payment request"
      >
        <div class="space-y-5">
          <div class="loading-surface h-10 w-2/3 rounded-xl bg-[#e8edf5]"></div>
          <div
            class="loading-surface h-64 rounded-2xl border border-[#e0e6ef] bg-white"
          ></div>
          <div
            class="loading-surface h-20 rounded-2xl border border-[#e0e6ef] bg-white"
          ></div>
        </div>
        <div
          class="loading-surface h-96 rounded-2xl border border-[#d7e0ee] bg-white"
        ></div>
        <span class="sr-only">Loading payment details</span>
      </div>
    {:else if error}
      <div
        class="mt-12 rounded-2xl border border-[#ecd0d0] bg-white p-10 text-center shadow-[0_14px_40px_rgba(23,34,56,0.035)]"
      >
        <XCircle size={28} class="mx-auto text-[#b95757]" />
        <h1 class="mt-4 text-lg font-semibold">Payment link unavailable</h1>
        <p class="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#7f8a9d]">
          {error}
        </p>
      </div>
    {:else if request}
      <div class="mt-8 sm:mt-12">
        <div
          data-enter="header"
          class="flex flex-col gap-5 border-b border-[#e2e7ef] pb-7 sm:flex-row sm:items-end sm:justify-between"
        >
          <div class="max-w-2xl">
            <div
              class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2454d6]"
            >
              <BadgeCheck size={15} />Arc payment request
            </div>
            <h1
              class="mt-4 text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-[#172238]"
            >
              {request.publicDescription?.trim() || 'Payment request'}
            </h1>
            <div class="mt-5 flex flex-wrap items-center gap-x-3 gap-y-3">
              <span
                class="grid h-9 w-9 place-items-center rounded-full bg-[#e9efff] text-sm font-semibold text-[#2454d6]"
                aria-hidden="true"
                >{requesterInitial(request.requesterName)}</span
              >
              <div>
                <div class="text-sm font-semibold text-[#33415b]">
                  Requested by {request.requesterName?.trim() || 'wallet owner'}
                </div>
                <div
                  class="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[#6f7e95]"
                >
                  <span class="font-mono"
                    >{shortenAddress(request.recipient, 10, 8)}</span
                  ><span aria-hidden="true">•</span><span
                    class="inline-flex items-center gap-1 text-[#2b8c67]"
                    ><BadgeCheck size={13} />Wallet ownership verified</span
                  >
                </div>
              </div>
            </div>
            {#if request.publicReference || request.dueDate}
              <div class="mt-4 flex flex-wrap gap-2 text-xs text-[#596b87]">
                {#if request.publicReference}<span
                    class="rounded-full border border-[#dfe6f1] bg-white px-3 py-1.5"
                    >Reference: {request.publicReference}</span
                  >{/if}
                {#if request.dueDate}<span
                    class="rounded-full border border-[#dfe6f1] bg-white px-3 py-1.5"
                    >Due {formatDueDate(request.dueDate)}</span
                  >{/if}
              </div>
            {/if}
          </div>
          <StatusChip
            status={request.status}
            closed={Boolean(request.closedAt)}
          />
        </div>

        <div
          class="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start"
        >
          <main class="space-y-6">
            <section
              data-enter="summary"
              class="overflow-hidden rounded-2xl border border-[#e0e6ef] bg-white shadow-[0_14px_40px_rgba(23,34,56,0.035)]"
            >
              <div class="border-b border-[#edf0f5] px-5 py-6 sm:px-8 sm:py-8">
                <div class="text-xs font-medium text-[#8994a6]">
                  Amount remaining
                </div>
                <div
                  class="mono-numbers mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[clamp(2.8rem,8vw,4.8rem)] font-semibold leading-none tracking-[-0.045em] text-[#172238]"
                >
                  {formatUsdcBaseUnits(remaining)}
                  <span
                    class="text-base font-medium tracking-normal text-[#8994a6]"
                    >USDC</span
                  >
                </div>
                {#if request.network === 'testnet'}
                  <div
                    class="mt-5 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-[#fff8e8] px-3 py-2 text-xs font-medium text-[#7a5a13]"
                  >
                    <CircleAlert size={14} />Arc testnet<span
                      class="text-[#c6a45f]">•</span
                    ><span>Testnet funds have no real value</span>
                  </div>
                {:else}
                  <div
                    class="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#2b8c67]"
                  >
                    <CircleCheck size={14} />Arc mainnet<span
                      class="text-[#b4bdca]">•</span
                    ><span>Verified after block confirmation</span>
                  </div>
                {/if}
              </div>
              {#if BigInt(request.paidMicroUsdc) > 0n}
                <div
                  class="grid grid-cols-1 divide-y divide-[#edf0f5] sm:grid-cols-3 sm:divide-x sm:divide-y-0"
                >
                  <div class="px-5 py-4 sm:px-8">
                    <div class="text-[11px] text-[#7f8a9d]">Requested</div>
                    <div
                      class="mono-numbers mt-1 text-sm font-semibold text-[#33415b]"
                    >
                      {formatUsdcBaseUnits(request.amountMicroUsdc)} USDC
                    </div>
                  </div>
                  <div class="px-5 py-4 sm:px-8">
                    <div class="text-[11px] text-[#7f8a9d]">Received</div>
                    <div
                      class="mono-numbers mt-1 text-sm font-semibold text-[#33415b]"
                    >
                      {formatUsdcBaseUnits(request.paidMicroUsdc)} USDC
                    </div>
                  </div>
                  <div class="px-5 py-4 sm:px-8">
                    <div class="text-[11px] text-[#7f8a9d]">
                      {BigInt(request.overpaidMicroUsdc) > 0n
                        ? 'Overpaid'
                        : 'Remaining'}
                    </div>
                    <div
                      class="mono-numbers mt-1 text-sm font-semibold text-[#33415b]"
                    >
                      {formatUsdcBaseUnits(
                        BigInt(request.overpaidMicroUsdc) > 0n
                          ? request.overpaidMicroUsdc
                          : request.remainingMicroUsdc
                      )} USDC
                    </div>
                  </div>
                </div>
              {:else}
                <div
                  class="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-xs sm:px-8"
                >
                  <span class="inline-flex items-center gap-2 text-[#596b87]"
                    ><Info size={14} />No payments received yet</span
                  ><span class="text-[#7f8a9d]"
                    >Full or partial payment accepted</span
                  >
                </div>
              {/if}
            </section>

            <details
              ontoggle={animateDisclosure}
              class="group overflow-hidden rounded-2xl border border-[#e0e6ef] bg-white shadow-[0_14px_40px_rgba(23,34,56,0.035)]"
            >
              <summary
                class="disclosure-summary flex min-h-20 cursor-pointer items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[#fbfcfe] sm:px-7"
              >
                <span class="flex min-w-0 items-center gap-3">
                  <span
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f1f5fb] text-[#596b87]"
                  >
                    <Info size={16} />
                  </span>
                  <span class="min-w-0">
                    <span
                      class="block text-xs font-semibold uppercase tracking-[0.13em] text-[#7f8a9d]"
                      >Request details</span
                    >
                    <span class="mt-1 block text-sm text-[#596b87]"
                      >Recipient, network and payment reference</span
                    >
                  </span>
                </span>
                <ChevronDown
                  size={18}
                  class="shrink-0 text-[#7f8a9d] transition-transform duration-200 group-open:rotate-180"
                />
              </summary>

              <div
                data-disclosure-body
                class="border-t border-[#edf0f5] px-5 pb-5 pt-6 sm:px-7 sm:pb-7"
              >
                <div class="flex items-start justify-between gap-4">
                  <h2 class="text-lg font-semibold text-[#172238]">
                    Confirm where the payment goes
                  </h2>
                  <span
                    class="rounded-full bg-[#eff3fa] px-2.5 py-1 text-[10px] font-semibold text-[#6f7e95]"
                    >USDC</span
                  >
                </div>
                <dl class="mt-4 divide-y divide-[#edf0f5] text-sm">
                  <div
                    class="grid gap-2 py-4 first:pt-0 sm:grid-cols-[145px_1fr] sm:gap-5"
                  >
                    <dt class="text-[#8994a6]">Requested by</dt>
                    <dd class="font-medium text-[#33415b]">
                      {request.requesterName?.trim() || 'Wallet owner'}
                    </dd>
                  </div>
                  <div
                    class="grid gap-2 py-4 sm:grid-cols-[145px_1fr] sm:gap-5"
                  >
                    <dt class="text-[#8994a6]">Recipient wallet</dt>
                    <dd class="flex min-w-0 items-center gap-2">
                      <span
                        class="min-w-0 flex-1 break-all font-mono text-xs leading-5 text-[#33415b]"
                        >{request.recipient}</span
                      >
                      <button
                        type="button"
                        class="btn btn-ghost btn-square btn-xs shrink-0 rounded-md text-[#2454d6]"
                        aria-label="Copy recipient wallet"
                        onclick={copyRecipient}><Copy size={13} /></button
                      >
                    </dd>
                  </div>
                  <div
                    class="grid gap-2 py-4 sm:grid-cols-[145px_1fr] sm:gap-5"
                  >
                    <dt class="text-[#8994a6]">Network</dt>
                    <dd class="font-medium text-[#33415b]">
                      Arc {request.network}
                    </dd>
                  </div>
                  <div
                    class="grid gap-2 py-4 sm:grid-cols-[145px_1fr] sm:gap-5"
                  >
                    <dt class="text-[#8994a6]">Payment reference</dt>
                    <dd class="flex min-w-0 items-center gap-2">
                      <span
                        class="min-w-0 flex-1 truncate font-mono text-xs text-[#33415b]"
                        title={request.token}
                        >{showFullReference
                          ? request.token
                          : shortenAddress(request.token, 12, 8)}</span
                      >
                      <button
                        type="button"
                        class="btn btn-ghost btn-square btn-xs rounded-md text-[#2454d6]"
                        aria-label="Copy payment reference"
                        onclick={copyReference}><Copy size={13} /></button
                      >
                      <button
                        type="button"
                        class="hidden text-[10px] font-semibold text-[#2454d6] sm:block"
                        onclick={() => (showFullReference = !showFullReference)}
                        >{showFullReference ? 'Less' : 'Full'}</button
                      >
                    </dd>
                  </div>
                  <div
                    class="grid gap-2 py-4 sm:grid-cols-[145px_1fr] sm:gap-5"
                  >
                    <dt class="text-[#8994a6]">Created</dt>
                    <dd class="text-[#33415b]">
                      {formatDate(request.createdAt)}
                    </dd>
                  </div>
                  {#if request.dueDate}
                    <div
                      class="grid gap-2 py-4 last:pb-0 sm:grid-cols-[145px_1fr] sm:gap-5"
                    >
                      <dt class="text-[#8994a6]">Due date</dt>
                      <dd class="text-[#33415b]">
                        {formatDueDate(request.dueDate)}
                      </dd>
                    </div>
                  {/if}
                </dl>
                <div
                  class="mt-6 flex items-start gap-3 rounded-xl bg-[#f7f9fc] px-4 py-3.5 text-xs leading-5 text-[#596b87]"
                >
                  <ShieldCheck
                    size={16}
                    class="mt-0.5 shrink-0 text-[#2b8c67]"
                  />
                  <span
                    >Settlr does not hold funds. The wallet sends USDC directly
                    to the address above.</span
                  >
                </div>
              </div>
            </details>

            {#if request.payments.length > 0}
              <section
                class="rounded-2xl border border-[#e0e6ef] bg-white p-5 shadow-[0_14px_40px_rgba(23,34,56,0.035)] sm:p-7"
              >
                <div class="flex items-center justify-between gap-4">
                  <div>
                    <div
                      class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-[#8994a6]"
                    >
                      <CheckCircle2 size={15} class="text-[#2b8c67]" />Verified
                      transfers
                    </div>
                    <h2 class="mt-2 text-lg font-semibold text-[#172238]">
                      Payment history
                    </h2>
                  </div>
                  <span class="text-xs text-[#8994a6]"
                    >{request.payments.length}
                    {request.payments.length === 1
                      ? 'transfer'
                      : 'transfers'}</span
                  >
                </div>
                <div class="mt-5 divide-y divide-[#edf0f5]">
                  {#each request.payments as payment}
                    <a
                      href={payment.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      class="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0 hover:bg-[#fbfcfe]"
                    >
                      <div class="min-w-0">
                        <div class="font-mono text-xs text-[#596579]">
                          {shortenAddress(payment.payer, 10, 8)}
                        </div>
                        <div class="mt-1 text-[11px] text-[#8994a6]">
                          {formatDate(payment.receivedAt)}
                        </div>
                      </div>
                      <div class="flex shrink-0 items-center gap-3">
                        <span
                          class="mono-numbers text-sm font-semibold text-[#33415b]"
                          >{formatUsdcBaseUnits(payment.amountMicroUsdc)} USDC</span
                        >
                        <ExternalLink size={14} class="text-[#8994a6]" />
                      </div>
                    </a>
                  {/each}
                </div>
              </section>
            {/if}
          </main>

          <aside class="lg:sticky lg:top-6" data-enter="payment">
            <section
              data-payment-card
              class="rounded-2xl border border-[#cfdcf3] bg-white p-5 shadow-[0_18px_46px_rgba(23,34,56,0.08)] sm:p-7"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div
                    class="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#2454d6]"
                  >
                    {isRecipientOwner && !paymentUnavailable
                      ? 'Requester preview'
                      : isClosedLink && !isSettled
                        ? 'Request closed'
                        : isSettled
                          ? 'Payment status'
                          : walletPreview
                            ? 'Wallet ready'
                            : 'Payment'}
                  </div>
                  <h2
                    class="mt-2 text-xl font-semibold tracking-[-0.015em] text-[#172238]"
                  >
                    {isRecipientOwner && !paymentUnavailable
                      ? 'This is your request'
                      : isClosedLink && !isSettled
                        ? 'Payment link closed'
                        : isSettled
                          ? 'Payment settled'
                          : 'Pay this request'}
                  </h2>
                </div>
                <span
                  class="rounded-full bg-[#eff3fa] px-2.5 py-1 text-[10px] font-semibold text-[#6f7e95]"
                  >USDC</span
                >
              </div>

              {#if isRecipientOwner && !paymentUnavailable}
                <div
                  data-wallet-state
                  class="mt-6 rounded-xl border border-[#d8e4f8] bg-[#f4f7ff] p-4"
                >
                  <div class="flex items-start gap-3">
                    <span
                      class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-[#2454d6] shadow-sm"
                      ><UserRound size={17} /></span
                    >
                    <div>
                      <div class="text-sm font-semibold text-[#33415b]">
                        Requester view
                      </div>
                      <p class="mt-1 text-xs leading-5 text-[#596b87]">
                        This request belongs to the signed in wallet. Payment is
                        hidden here to prevent an accidental self payment.
                      </p>
                    </div>
                  </div>
                </div>
                <a
                  href="/app#requests"
                  class="btn mt-5 h-12 w-full rounded-xl border-[#2454d6] bg-[#2454d6] text-sm text-white shadow-[0_10px_25px_rgba(36,84,214,0.22)] hover:border-[#1f48b8] hover:bg-[#1f48b8]"
                  ><ArrowLeft size={16} />Manage this request</a
                >
                <p class="mt-3 text-center text-xs leading-5 text-[#6f7e95]">
                  Open the payment link in a private window to test the payer
                  experience.
                </p>
              {:else if !paymentUnavailable}
                <div class="mt-6" data-amount-control>
                  <div class="flex items-center justify-between gap-3">
                    <label
                      for="payment-amount"
                      class="text-xs font-semibold text-[#33415b]"
                      >Amount to pay</label
                    >
                    <button
                      type="button"
                      class="text-[11px] font-semibold text-[#2454d6] hover:underline disabled:text-[#a1adbd]"
                      disabled={isSending}
                      onclick={togglePartialPayment}
                      >{allowPartialPayment
                        ? 'Use full amount'
                        : 'Pay a different amount'}</button
                    >
                  </div>
                  <div
                    class={`relative mt-2 rounded-xl border-2 transition-colors ${allowPartialPayment ? 'bg-white' : 'bg-[#f7f9fc]'} ${amountError && amount ? 'border-[#d17b7b]' : 'border-[#d8e1ee] focus-within:border-[#2454d6] focus-within:ring-4 focus-within:ring-[#2454d6]/10'}`}
                  >
                    <input
                      id="payment-amount"
                      bind:value={amount}
                      class="mono-numbers h-14 w-full border-0 bg-transparent px-4 pr-20 text-xl font-semibold text-[#172238] shadow-none outline-none placeholder:text-[#a1adbd] focus:border-transparent focus:outline-none focus:ring-0 read-only:cursor-default"
                      inputmode="decimal"
                      aria-describedby="payment-amount-help"
                      readonly={!allowPartialPayment}
                      disabled={isSending}
                      onchange={() => wallet && void prepareWallet(wallet)}
                    />
                    <span
                      class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-semibold text-[#8994a6]"
                      >USDC</span
                    >
                  </div>
                  <p
                    id="payment-amount-help"
                    class={`mt-2 text-xs leading-5 ${amountError && amount ? 'text-[#b95757]' : 'text-[#6f7e95]'}`}
                  >
                    {amountError && amount
                      ? amountError
                      : allowPartialPayment
                        ? `Choose an amount up to ${formatUsdcBaseUnits(remaining)} USDC.`
                        : `Full remaining amount: ${formatUsdcBaseUnits(parsedAmount > 0n ? parsedAmount : 0n)} USDC.`}
                  </p>
                </div>

                {#if walletPreview}
                  <div
                    data-wallet-state
                    class="mt-5 overflow-hidden rounded-xl border border-[#dfe6f1] bg-[#fbfcfe]"
                  >
                    <div
                      class="flex items-center justify-between gap-3 border-b border-[#e8edf4] px-4 py-3"
                    >
                      <span class="flex min-w-0 items-center gap-2">
                        <span
                          class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e9efff] text-[#2454d6]"
                          ><Wallet size={15} /></span
                        >
                        <span class="min-w-0">
                          <span
                            class="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7f8a9d]"
                            >Payment wallet</span
                          ><span
                            class="block truncate font-mono text-xs text-[#33415b]"
                            >{shortenAddress(walletPreview.address, 8, 6)}</span
                          >
                        </span>
                      </span>
                      <span
                        class={`inline-flex items-center gap-1 text-[11px] font-semibold ${walletPreview.hasSufficientBalance ? 'text-[#257b5d]' : 'text-[#b15b5b]'}`}
                        >{#if walletPreview.hasSufficientBalance}<CircleCheck
                            size={13}
                          />Ready{:else}<CircleAlert size={13} />Low balance{/if}</span
                      >
                    </div>
                    <dl class="divide-y divide-[#e8edf4] px-4 text-xs">
                      <div class="flex justify-between gap-4 py-3">
                        <dt class="text-[#7f8a9d]">Available</dt>
                        <dd class="mono-numbers font-semibold text-[#33415b]">
                          {formatUsdcBaseUnits(walletPreview.balanceMicroUsdc)} USDC
                        </dd>
                      </div>
                      <div class="flex justify-between gap-4 py-3">
                        <dt class="text-[#7f8a9d]">Estimated network fee</dt>
                        <dd class="font-medium text-[#596b87]">
                          {formatFee(estimatedFee)}
                        </dd>
                      </div>
                      <div class="flex justify-between gap-4 py-3">
                        <dt class="text-[#7f8a9d]">Estimated total</dt>
                        <dd class="mono-numbers font-semibold text-[#172238]">
                          {formatUsdcBaseUnits(estimatedTotal)} USDC
                        </dd>
                      </div>
                    </dl>
                  </div>
                {:else}
                  <div
                    data-wallet-state
                    class="mt-5 flex items-start gap-3 rounded-xl bg-[#f7f9fc] px-4 py-3.5"
                  >
                    <Wallet size={17} class="mt-0.5 shrink-0 text-[#596b87]" />
                    <div>
                      <div class="text-xs font-semibold text-[#33415b]">
                        Wallet and USDC required
                      </div>
                      <p class="mt-1 text-xs leading-5 text-[#6f7e95]">
                        Settlr will connect the wallet, switch to Arc and check
                        the balance before any transaction is requested.
                      </p>
                    </div>
                  </div>
                {/if}

                <details
                  ontoggle={animateDisclosure}
                  class="group mt-5 overflow-hidden rounded-xl border border-[#e6ebf2] bg-[#fbfcfe]"
                >
                  <summary
                    class="disclosure-summary flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 py-3 text-xs transition-colors hover:bg-[#f6f8fb]"
                  >
                    <span
                      class="flex items-center gap-2 font-semibold text-[#596b87]"
                      ><Info size={14} />Payment details</span
                    >
                    <span class="flex items-center gap-2 text-[#7f8a9d]">
                      <span class="hidden sm:inline">Network and receipt</span>
                      <ChevronDown
                        size={15}
                        class="shrink-0 transition-transform duration-200 group-open:rotate-180"
                      />
                    </span>
                  </summary>
                  <div
                    data-disclosure-body
                    class="divide-y divide-[#edf0f5] border-t border-[#edf0f5] px-4"
                  >
                    <div
                      class="flex items-center justify-between gap-4 py-3 text-xs"
                    >
                      <span class="text-[#7f8a9d]">Network</span><span
                        class="font-semibold text-[#33415b]"
                        >Arc {request.network}</span
                      >
                    </div>
                    <div
                      class="flex items-start justify-between gap-4 py-3 text-xs"
                    >
                      <span class="text-[#7f8a9d]">Confirmation</span><span
                        class="max-w-[180px] text-right font-medium leading-5 text-[#596b87]"
                        >Usually within one minute after block confirmation</span
                      >
                    </div>
                    <div
                      class="flex items-start justify-between gap-4 py-3 text-xs"
                    >
                      <span class="text-[#7f8a9d]">Receipt</span><span
                        class="max-w-[180px] text-right font-medium leading-5 text-[#596b87]"
                        >Appears here after verification</span
                      >
                    </div>
                  </div>
                </details>

                {#if !request.paymentsEnabled}
                  <div
                    class="mt-5 rounded-xl border border-[#ecd9ad] bg-[#fff9eb] px-4 py-3 text-xs leading-5 text-[#7a5a13]"
                    role="status"
                  >
                    Payments are disabled in this environment. The request can
                    be reviewed, but no wallet transaction can be submitted.
                  </div>
                {/if}

                <button
                  class="btn mt-5 h-13 min-h-13 w-full rounded-xl border-[#2454d6] bg-[#2454d6] text-sm text-white shadow-[0_10px_25px_rgba(36,84,214,0.24)] transition-[transform,background-color,box-shadow] hover:border-[#1f48b8] hover:bg-[#1f48b8] hover:shadow-[0_12px_30px_rgba(36,84,214,0.28)] active:scale-[0.985]"
                  disabled={isCheckingWallet ||
                    isSending ||
                    verificationState === 'pending' ||
                    verificationState === 'delayed' ||
                    !amount ||
                    Boolean(amountError) ||
                    !request.paymentsEnabled ||
                    Boolean(
                      walletPreview && !walletPreview.hasSufficientBalance
                    )}
                  onclick={() =>
                    walletPreview ? handlePay() : prepareWallet()}
                >
                  {#if isCheckingWallet}<LoaderCircle
                      size={17}
                      class="animate-spin"
                    />Checking wallet…{:else if isSending}<LoaderCircle
                      size={17}
                      class="animate-spin"
                    />Confirm in wallet…{:else if verificationState === 'pending'}<LoaderCircle
                      size={17}
                      class="animate-spin"
                    />Checking payment…{:else if verificationState === 'delayed'}<Clock3
                      size={17}
                    />Verification delayed{:else if !request.paymentsEnabled}<Wallet
                      size={17}
                    />Payments unavailable{:else if walletPreview}<Wallet
                      size={17}
                    />Pay {amount || '0.00'} USDC{:else}<Wallet
                      size={17}
                    />Connect wallet to continue{/if}
                </button>
                {#if walletPreview}
                  <button
                    class="btn btn-ghost mt-2 h-10 w-full rounded-lg text-xs text-[#596b87]"
                    type="button"
                    disabled={isSending || !request.paymentsEnabled}
                    onclick={handleSwitchWallet}>Use another wallet</button
                  >
                {/if}

                {#if message}
                  <div
                    data-status-message
                    class={`mt-4 rounded-xl border px-4 py-3 text-xs leading-5 ${verificationState === 'rejected' ? 'border-[#ecd0d0] bg-[#fff5f5] text-[#9b4f4f]' : verificationState === 'verified' ? 'border-[#cce6d8] bg-[#f0faf4] text-[#257b5d]' : 'border-[#dce5f5] bg-[#f3f7ff] text-[#536786]'}`}
                    role="status"
                    aria-live="polite"
                  >
                    {message}
                    {#if transactionHash}
                      <a
                        class="mt-2 flex items-center gap-1 font-mono text-[10px] text-[#2454d6]"
                        href={`${ARC_EXPLORER_URL}/tx/${transactionHash}`}
                        target="_blank"
                        rel="noreferrer"
                        >View transaction {shortenAddress(
                          transactionHash,
                          12,
                          8
                        )}<ExternalLink size={12} /></a
                      >
                    {/if}
                  </div>
                {/if}
              {:else if isSettled}
                <div
                  data-wallet-state
                  class="mt-6 rounded-xl border border-[#cce6d8] bg-[#f0faf4] px-4 py-4"
                >
                  <div
                    class="flex items-center gap-2 text-xs font-semibold text-[#257b5d]"
                  >
                    <CheckCircle2 size={16} />{request.status}
                  </div>
                  <div
                    class="mono-numbers mt-2 text-xl font-semibold text-[#172238]"
                  >
                    {formatUsdcBaseUnits(request.paidMicroUsdc)} USDC confirmed
                  </div>
                  <p class="mt-2 text-xs leading-5 text-[#596b87]">
                    The payment is verified. A receipt with every confirmed
                    transfer is available below.
                  </p>
                </div>
              {:else}
                <div
                  data-wallet-state
                  class="mt-6 rounded-xl border border-[#ead9ad] bg-[#fff9eb] px-4 py-4"
                >
                  <div
                    class="flex items-center gap-2 text-xs font-semibold text-[#7a5a13]"
                  >
                    <CircleAlert size={16} />Payment link closed
                  </div>
                  <p class="mt-2 text-sm font-semibold text-[#172238]">
                    No further payments can be started from this link.
                  </p>
                  <p class="mt-2 text-xs leading-5 text-[#596b87]">
                    {#if BigInt(request.paidMicroUsdc) > 0n}
                      Verified payments remain visible. The open balance is {formatUsdcBaseUnits(
                        request.remainingMicroUsdc
                      )} USDC.
                    {:else}
                      This request has not received a verified payment yet.
                    {/if}
                  </p>
                </div>
              {/if}

              {#if request.payments.length > 0}
                <a
                  href={`/receipt/${request.token}`}
                  class="btn btn-ghost mt-4 h-11 w-full rounded-lg border border-[#dfe6f1] text-xs text-[#596b87]"
                  ><ReceiptText size={15} />View verified receipt</a
                >
              {/if}
            </section>
            {#if !isRecipientOwner && !paymentUnavailable}
              <div
                class="mt-4 flex items-start gap-2 px-1 text-xs leading-5 text-[#6f7e95]"
              >
                <Clock3 size={15} class="mt-0.5 shrink-0 text-[#8994a6]" />After
                payment, verification usually finishes within one minute. A
                receipt appears automatically and no second payment is started.
              </div>
            {/if}
          </aside>
        </div>
      </div>
    {/if}

    <footer
      class="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[11px] text-[#6f7e95]"
    >
      <span>Powered by Settlr</span><span aria-hidden="true">•</span><span
        >Arc {request?.network ?? ARC_ENVIRONMENT}</span
      ><span aria-hidden="true">•</span><a
        href="/docs"
        class="underline decoration-[#cbd5e5] underline-offset-2"
        >How it works</a
      >
    </footer>
  </div>
</div>

<style>
  .loading-surface {
    animation: payment-pulse 1.45s ease-in-out infinite;
  }
  @keyframes payment-pulse {
    0%,
    100% {
      opacity: 0.55;
    }
    50% {
      opacity: 1;
    }
  }
  .disclosure-summary {
    list-style: none;
  }
  .disclosure-summary::-webkit-details-marker {
    display: none;
  }
  .disclosure-summary:focus-visible {
    outline: 3px solid rgba(36, 84, 214, 0.28);
    outline-offset: -3px;
    border-radius: 12px;
  }
  :global(.status-chip) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 7px 10px;
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
  }
  :global(.status-chip::before) {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: currentColor;
  }
  :global(.status-success) {
    color: #2b8c67;
    background: #eaf8f1;
  }
  :global(.status-warning) {
    color: #a86b13;
    background: #fff6e6;
  }
  :global(.status-info) {
    color: #4567b7;
    background: #eef2ff;
  }
  :global(.status-neutral) {
    color: #68768b;
    background: #eff2f6;
  }
  @media (prefers-reduced-motion: reduce) {
    .loading-surface {
      animation: none;
    }
  }
</style>
