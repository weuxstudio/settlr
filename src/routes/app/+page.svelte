<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Brand from '$lib/components/Brand.svelte';
  import WorkspaceEntry from '$lib/components/WorkspaceEntry.svelte';
  import NetworkBadge from '$lib/components/NetworkBadge.svelte';
  import StatusChip from '$lib/components/StatusChip.svelte';
  import {
    readWorkspaceSession,
    withoutCreateIntent,
    type SignInPhase
  } from '$lib/client/workspace';
  import { onDestroy, onMount, tick } from 'svelte';
  import { animate } from 'animejs';
  import {
    Activity,
    ArrowUpRight,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    CircleAlert,
    Copy,
    ExternalLink,
    Download,
    FileCheck2,
    FilePlus2,
    Filter,
    Link2,
    LogOut,
    Menu,
    Plus,
    RefreshCw,
    Search,
    WalletCards,
    X
  } from 'lucide-svelte';
  import {
    formatDate,
    formatRelative,
    formatUsdc,
    formatUsdcBaseUnits,
    parseUsdc
  } from '$lib/format';
  import {
    ARC_ENVIRONMENT,
    ARC_EXPLORER_URL,
    shortenAddress
  } from '$lib/config';
  import {
    connectWallet,
    signInWithEthereum,
    switchToArc,
    switchWalletAccount
  } from '$lib/client/wallet';
  import type { PaymentRequest, PaymentStatus } from '$lib/types';

  let requests: PaymentRequest[] = [];
  let selectedRequest: PaymentRequest | null = null;
  let query = '';
  let statusFilter: 'All' | PaymentStatus = 'All';
  let isCreateOpen = false;
  let isMobileNavOpen = false;
  let isWalletMenuOpen = false;
  let walletAddress = '';
  let toast = '';
  let walletHint = '';
  let isLoading = false;
  let isLoadingRequests = false;
  let isConnecting = false;
  let sessionChecked = false;
  let sessionError = false;
  let signInPhase: SignInPhase = 'idle';
  let consumingIntent = false;
  let sessionGeneration = 0;
  let sessionReset: Promise<void> = Promise.resolve();

  $: if (
    browser &&
    sessionChecked &&
    walletAddress &&
    !isLoadingRequests &&
    !consumingIntent &&
    $page.url.searchParams.get('intent') === 'create'
  ) {
    void consumeCreateIntent();
  }

  async function consumeCreateIntent() {
    const destination = withoutCreateIntent($page.url);
    if (!destination) return;
    consumingIntent = true;
    try {
      await goto(destination, {
        replaceState: true,
        noScroll: true,
        keepFocus: true
      });
      if (walletAddress) await openCreateRequest();
    } finally {
      consumingIntent = false;
    }
  }

  function clearAccountData() {
    walletAddress = '';
    newRecipient = '';
    requests = [];
    selectedRequest = null;
    isCreateOpen = false;
    isWalletMenuOpen = false;
    isMobileNavOpen = false;
    isLoadingRequests = false;
    requestsLoadError = '';
    lastUpdatedAt = '';
    newTitle = '';
    newPublicDescription = '';
    newRequesterName = '';
    newPublicReference = '';
    newDueDate = '';
    newAmount = '';
    publicDescriptionDraft = '';
    requesterNameDraft = '';
    publicReferenceDraft = '';
    dueDateDraft = '';
    requestFormErrors = {};
    requestFormError = '';
    isLoading = false;
    isSavingPublicDescription = false;
    toast = '';
    query = '';
    statusFilter = 'All';
  }

  async function checkSession() {
    const generation = ++sessionGeneration;
    sessionChecked = false;
    sessionError = false;
    walletHint = '';
    try {
      const address = await readWorkspaceSession();
      if (generation !== sessionGeneration) return;
      if (address) {
        walletAddress = address;
        newRecipient = address;
        await loadRequests();
      }
    } catch (error) {
      if (generation !== sessionGeneration) return;
      clearAccountData();
      sessionError = true;
      walletHint =
        error instanceof Error
          ? error.message
          : 'Sign-in is temporarily unavailable. Please try again.';
    } finally {
      if (generation === sessionGeneration) sessionChecked = true;
    }
  }
  let isModalOpen = false;
  let requestsLoadError = '';
  let lastUpdatedAt = '';
  let newTitle = '';
  let newPublicDescription = '';
  let newRequesterName = '';
  let newPublicReference = '';
  let newDueDate = '';
  let newAmount = '';
  let newRecipient = '';
  let publicDescriptionDraft = '';
  let requesterNameDraft = '';
  let publicReferenceDraft = '';
  let dueDateDraft = '';
  let isSavingPublicDescription = false;
  let requestFormErrors: Partial<
    Record<'requesterName' | 'publicDescription' | 'amount' | 'dueDate', string>
  > = {};
  let requestFormError = '';
  let minimumDueDate = '';
  let scopeRoot: HTMLDivElement;
  let createDialogElement: HTMLDivElement;
  let requesterNameInput: HTMLInputElement;
  let publicDescriptionInput: HTMLInputElement;
  let createTriggerElement: HTMLElement | null = null;

  $: isModalOpen = Boolean(selectedRequest || isCreateOpen);

  $: if (browser) {
    document.documentElement.style.overflow = isModalOpen ? 'hidden' : '';
    document.body.style.overflow = isModalOpen ? 'hidden' : '';
  }

  onDestroy(() => {
    if (browser) {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
  });

  async function loadRequests() {
    const owner = walletAddress;
    const generation = sessionGeneration;
    isLoadingRequests = true;
    requestsLoadError = '';
    try {
      const response = await fetch('/api/requests', { cache: 'no-store' });
      if (!response.ok)
        throw new Error('Payment requests could not be loaded.');
      const loaded = (await response.json()).requests as PaymentRequest[];
      if (owner !== walletAddress || generation !== sessionGeneration) return;
      requests = loaded;
      lastUpdatedAt = new Date().toISOString();
    } catch (error) {
      if (owner !== walletAddress || generation !== sessionGeneration) return;
      requestsLoadError =
        error instanceof Error
          ? error.message
          : 'Payment requests could not be loaded.';
    } finally {
      if (owner === walletAddress && generation === sessionGeneration)
        isLoadingRequests = false;
    }
  }

  function amountBase(request: PaymentRequest) {
    return BigInt(request.amountMicroUsdc ?? parseUsdc(request.amount));
  }
  function paidBase(request: PaymentRequest) {
    return BigInt(request.paidMicroUsdc ?? parseUsdc(request.paid));
  }

  $: filteredRequests = requests.filter((request) => {
    const matchesQuery =
      request.title.toLowerCase().includes(query.toLowerCase()) ||
      request.token.toLowerCase().includes(query.toLowerCase()) ||
      (request.publicReference ?? '')
        .toLowerCase()
        .includes(query.toLowerCase()) ||
      (request.requesterName ?? '').toLowerCase().includes(query.toLowerCase());
    const status = getStatus(request);
    return matchesQuery && (statusFilter === 'All' || status === statusFilter);
  });

  $: totals = {
    outstanding: requests.reduce((sum, request) => {
      const remaining = amountBase(request) - paidBase(request);
      return sum + (remaining > 0n ? remaining : 0n);
    }, 0n),
    collected: requests.reduce((sum, request) => sum + paidBase(request), 0n),
    settled: requests.filter((request) =>
      ['Paid', 'Overpaid'].includes(getStatus(request))
    ).length
  };

  $: settlementDurations = requests
    .filter((request) => ['Paid', 'Overpaid'].includes(getStatus(request)))
    .map((request) => {
      const orderedPayments = [...request.payments].sort(
        (a, b) =>
          new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
      );
      let accumulated = 0n;
      const finalPayment = orderedPayments.find((payment) => {
        accumulated += BigInt(
          payment.amountMicroUsdc ?? parseUsdc(payment.amount)
        );
        return accumulated >= amountBase(request);
      });
      if (!finalPayment) return null;
      const duration =
        new Date(finalPayment.receivedAt).getTime() -
        new Date(request.createdAt).getTime();
      return Number.isFinite(duration) && duration >= 0 ? duration : null;
    })
    .filter((duration): duration is number => duration !== null);

  $: averageSettlement = settlementDurations.length
    ? formatDuration(
        settlementDurations.reduce((sum, duration) => sum + duration, 0) /
          settlementDurations.length
      )
    : 'Not enough data';

  $: activityItems = requests
    .flatMap((request) =>
      request.payments.map((payment) => ({ request, payment }))
    )
    .sort(
      (a, b) =>
        new Date(b.payment.receivedAt).getTime() -
        new Date(a.payment.receivedAt).getTime()
    )
    .slice(0, 5);

  onMount(() => {
    minimumDueDate = new Date().toISOString().slice(0, 10);
    void checkSession();
    const provider = window.ethereum as
      | (typeof window.ethereum & {
          on?: (event: string, handler: (value: unknown) => void) => void;
          removeListener?: (
            event: string,
            handler: (value: unknown) => void
          ) => void;
        })
      | undefined;
    const clearWalletSession = () => {
      // Account and network selection are expected during these explicit steps.
      if (signInPhase === 'connecting' || signInPhase === 'network') return;
      sessionGeneration++;
      sessionChecked = true;
      clearAccountData();
      walletHint = 'The wallet changed. Sign in to open its workspace.';
      sessionReset = fetch('/api/auth/logout', { method: 'POST' })
        .then(() => undefined)
        .catch(() => {
          walletHint = 'The wallet changed. Please sign in again.';
        });
    };
    provider?.on?.('accountsChanged', clearWalletSession);
    provider?.on?.('chainChanged', clearWalletSession);
    return () => {
      provider?.removeListener?.('accountsChanged', clearWalletSession);
      provider?.removeListener?.('chainChanged', clearWalletSession);
    };
  });

  function revealWorkspace(node: HTMLElement) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return {};
    const animation = animate(node, {
      opacity: [0, 1],
      translateY: [8, 0],
      duration: 200,
      ease: 'out(3)'
    });
    return { destroy: () => animation.revert() };
  }

  function getStatus(request: PaymentRequest): PaymentStatus {
    const amount = amountBase(request);
    const paid = paidBase(request);
    if (paid === 0n) return 'Open';
    if (paid < amount) return 'Partially paid';
    if (paid === amount) return 'Paid';
    return 'Overpaid';
  }

  function formatDuration(milliseconds: number) {
    const minutes = Math.max(1, Math.round(milliseconds / 60_000));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `${hours}h`;
    return `${Math.round(hours / 24)}d`;
  }

  function formatDueDate(value?: string) {
    if (!value) return 'No due date';
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(`${value}T12:00:00`));
  }

  function isOverdue(request: PaymentRequest) {
    return Boolean(
      request.dueDate &&
      !['Paid', 'Overpaid'].includes(getStatus(request)) &&
      new Date(`${request.dueDate}T23:59:59`).getTime() < Date.now()
    );
  }

  function requestReference(request: PaymentRequest) {
    return request.publicReference?.trim()
      ? request.publicReference
      : shortenAddress(request.token, 8, 6);
  }

  function showToast(message: string) {
    toast = message;
    setTimeout(() => (toast = ''), 3600);
  }

  async function handleDisconnect() {
    if (isConnecting) return;
    sessionGeneration++;
    isConnecting = true;
    sessionChecked = false;
    clearAccountData();
    walletHint = '';
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok)
        throw new Error('Sign-out could not be confirmed. Please try again.');
      showToast('Wallet disconnected.');
    } catch {
      walletHint =
        'The server could not confirm sign-out. The local workspace has been cleared.';
    } finally {
      isConnecting = false;
      sessionChecked = true;
    }
  }

  async function authenticate(switchAccount = false) {
    if (isConnecting) return;
    const generation = ++sessionGeneration;
    isConnecting = true;
    signInPhase = 'connecting';
    sessionError = false;
    walletHint = '';
    clearAccountData();
    try {
      await sessionReset;
      if (switchAccount) {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (!response.ok)
          throw new Error(
            'Could not sign out of the previous account. Please try again.'
          );
      }
      const address = await (switchAccount
        ? switchWalletAccount()
        : connectWallet());
      await switchToArc(() => {
        signInPhase = 'network';
      });
      await signInWithEthereum(address, (phase) => {
        signInPhase = phase;
      });
      const authenticatedAddress = await readWorkspaceSession();
      if (generation !== sessionGeneration) {
        await fetch('/api/auth/logout', { method: 'POST' });
        throw new Error('The wallet changed during sign-in. Please try again.');
      }
      if (
        !authenticatedAddress ||
        authenticatedAddress.toLowerCase() !== address.toLowerCase()
      ) {
        throw new Error(
          'The wallet session could not be confirmed. Please try again.'
        );
      }
      walletAddress = authenticatedAddress;
      newRecipient = authenticatedAddress;
      await loadRequests();
      walletHint = '';
    } catch (error) {
      clearAccountData();
      walletHint =
        error instanceof Error
          ? error.message
          : 'Wallet connection failed. Please try again.';
    } finally {
      signInPhase = 'idle';
      isConnecting = false;
      sessionChecked = true;
    }
  }

  function handleConnect() {
    return authenticate();
  }
  function handleSwitchAccount() {
    return authenticate(true);
  }

  async function openCreateRequest() {
    if (!walletAddress) {
      walletHint = 'Connect a wallet before creating a request.';
      showToast(walletHint);
      return;
    }
    newRecipient = walletAddress;
    newRequesterName =
      requests.find((request) => request.requesterName)?.requesterName ?? '';
    requestFormErrors = {};
    requestFormError = '';
    createTriggerElement = document.activeElement as HTMLElement | null;
    isCreateOpen = true;
    await tick();
    const target = newRequesterName.trim()
      ? publicDescriptionInput
      : requesterNameInput;
    target?.focus();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animate(createDialogElement, {
        opacity: [0, 1],
        translateY: [10, 0],
        scale: [0.985, 1],
        duration: 190,
        ease: 'out(3)'
      });
    }
  }

  function closeCreateRequest() {
    if (isLoading) return;
    isCreateOpen = false;
    requestFormErrors = {};
    requestFormError = '';
    void tick().then(() => createTriggerElement?.focus());
  }

  function clearRequestError(field: keyof typeof requestFormErrors) {
    if (!requestFormErrors[field]) return;
    requestFormErrors = { ...requestFormErrors, [field]: undefined };
  }

  function handleCreateDialogKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeCreateRequest();
      return;
    }
    if (event.key !== 'Tab' || !createDialogElement) return;
    const focusable = Array.from(
      createDialogElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href], summary, select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.hasAttribute('hidden'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function copyRecipient() {
    await navigator.clipboard?.writeText(newRecipient);
    showToast('Recipient wallet copied.');
  }

  function draftAmountLabel() {
    try {
      const amount = parseUsdc(newAmount);
      return amount > 0n ? `${formatUsdcBaseUnits(amount)} USDC` : 'an amount';
    } catch {
      return 'an amount';
    }
  }

  function openRequest(request: PaymentRequest) {
    selectedRequest = request;
    publicDescriptionDraft = request.publicDescription ?? '';
    requesterNameDraft = request.requesterName ?? '';
    publicReferenceDraft = request.publicReference ?? '';
    dueDateDraft = request.dueDate ?? '';
  }

  async function savePublicDescription() {
    if (!selectedRequest) return;
    const generation = sessionGeneration;
    const publicDescription = publicDescriptionDraft.trim();
    const requesterName = requesterNameDraft.trim();
    if (
      !publicDescription ||
      publicDescription.length > 160 ||
      requesterName.length < 2 ||
      requesterName.length > 60
    ) {
      showToast('Add a requester name and a clear public payment purpose.');
      return;
    }
    isSavingPublicDescription = true;
    try {
      const response = await fetch(`/api/requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          publicDescription,
          requesterName,
          publicReference: publicReferenceDraft.trim(),
          dueDate: dueDateDraft
        })
      });
      if (!response.ok) throw new Error('Could not save the public purpose.');
      const updated = (await response.json()).request as PaymentRequest;
      if (generation !== sessionGeneration) return;
      selectedRequest = updated;
      requests = requests.map((request) =>
        request.id === updated.id ? updated : request
      );
      publicDescriptionDraft = updated.publicDescription ?? '';
      requesterNameDraft = updated.requesterName ?? '';
      publicReferenceDraft = updated.publicReference ?? '';
      dueDateDraft = updated.dueDate ?? '';
      showToast('Public payment details updated.');
    } catch (error) {
      if (generation !== sessionGeneration) return;
      showToast(
        error instanceof Error
          ? error.message
          : 'Could not save the public purpose.'
      );
    } finally {
      if (generation === sessionGeneration) isSavingPublicDescription = false;
    }
  }

  async function createRequest() {
    if (!walletAddress || isLoading) return;
    const generation = sessionGeneration;
    let amountBaseUnits: bigint | null = null;
    if (/^\d{1,30}(\.\d{1,6})?$/.test(newAmount.trim())) {
      try {
        amountBaseUnits = parseUsdc(newAmount);
      } catch {
        amountBaseUnits = null;
      }
    }
    const errors: typeof requestFormErrors = {};
    if (
      newRequesterName.trim().length < 2 ||
      newRequesterName.trim().length > 60
    ) {
      errors.requesterName = 'Enter the name the payer should recognize.';
    }
    if (!newPublicDescription.trim()) {
      errors.publicDescription = 'Describe what the payment is for.';
    }
    if (amountBaseUnits === null || amountBaseUnits <= 0n) {
      errors.amount = 'Enter a positive USDC amount with up to six decimals.';
    }
    if (newDueDate && minimumDueDate && newDueDate < minimumDueDate) {
      errors.dueDate = 'Choose today or a future date.';
    }
    requestFormErrors = errors;
    requestFormError = '';
    const firstError = (
      ['requesterName', 'publicDescription', 'amount', 'dueDate'] as const
    ).find((field) => errors[field]);
    if (firstError) {
      await tick();
      document.getElementById(`new-${firstError}`)?.focus();
      return;
    }
    const amount = newAmount.trim();
    const title = newTitle.trim() || newPublicDescription.trim().slice(0, 80);
    isLoading = true;
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title,
          publicDescription: newPublicDescription,
          requesterName: newRequesterName,
          publicReference: newPublicReference,
          dueDate: newDueDate,
          amount,
          recipient: newRecipient
        })
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(result.error ?? 'Could not create this request.');
      }
      const payload = await response.json();
      if (generation !== sessionGeneration) return;
      requests = [payload.request, ...requests];
      selectedRequest = payload.request;
      publicDescriptionDraft = payload.request.publicDescription ?? '';
      requesterNameDraft = payload.request.requesterName ?? '';
      publicReferenceDraft = payload.request.publicReference ?? '';
      dueDateDraft = payload.request.dueDate ?? '';
      isCreateOpen = false;
      newTitle = '';
      newPublicDescription = '';
      newPublicReference = '';
      newDueDate = '';
      newAmount = '';
      requestFormErrors = {};
      requestFormError = '';
      showToast('Payment request created.');
    } catch (error) {
      if (generation !== sessionGeneration) return;
      requestFormError =
        error instanceof Error
          ? error.message
          : 'Could not create this request.';
    } finally {
      if (generation === sessionGeneration) isLoading = false;
    }
  }

  async function copyLink(request: PaymentRequest) {
    const link = `${window.location.origin}/pay/${request.token}`;
    await navigator.clipboard?.writeText(link);
    showToast('Payment link copied.');
  }

  function selectFilter(value: 'All' | PaymentStatus) {
    statusFilter = value;
    isWalletMenuOpen = false;
  }
</script>

<svelte:head>
  <title
    >{walletAddress ? 'Payment overview' : 'Open your workspace'} | Settlr</title
  >
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div
  bind:this={scopeRoot}
  class="workspace app-shell min-h-screen bg-[#f8f8f5] text-[#172238]"
  data-page="workspace"
>
  <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <div class="soft-grid absolute inset-x-0 top-0 h-[520px] opacity-70"></div>
    <div
      class="absolute -right-48 -top-52 h-[560px] w-[560px] rounded-full bg-[#dbe7ff]/45 blur-3xl"
    ></div>
  </div>

  <header
    class="sticky top-0 z-40 border-b border-[#e2e7ef]/90 bg-[#f6f8fb]/90 backdrop-blur-xl"
  >
    <div
      class="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 lg:px-8"
    >
      <div class="flex items-center gap-3">
        {#if walletAddress}<button
            class="btn btn-ghost btn-square md:hidden"
            aria-label="Open navigation"
            onclick={() => (isMobileNavOpen = !isMobileNavOpen)}
            ><Menu size={19} /></button
          >{/if}
        <Brand />
      </div>
      {#if walletAddress}
        <nav
          aria-label="Dashboard sections"
          class="hidden items-center gap-1 rounded-xl border border-[#e2e7ef] bg-white/80 p-1 md:flex"
        >
          <a
            href="#requests"
            class="rounded-lg px-3 py-2 text-xs font-semibold text-[#596579] transition-colors hover:bg-[#f2f5fa] hover:text-[#172238] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2454d6]"
            >Requests</a
          >
          <a
            href="#activity"
            class="rounded-lg px-3 py-2 text-xs font-semibold text-[#596579] transition-colors hover:bg-[#f2f5fa] hover:text-[#172238] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2454d6]"
            >Activity</a
          >
          <a
            href="/docs"
            class="rounded-lg px-3 py-2 text-xs font-semibold text-[#596579] transition-colors hover:bg-[#f2f5fa] hover:text-[#172238] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2454d6]"
            >Documentation</a
          >
        </nav>
        <div class="flex items-center gap-2.5">
          {#if walletAddress}
            <NetworkBadge network={ARC_ENVIRONMENT} compact />
            <div class="relative">
              <button
                class="btn btn-sm h-10 gap-2 rounded-lg border-[#dce3ee] bg-white px-3 font-medium text-[#33415b] shadow-none hover:border-[#bdc9dd]"
                onclick={() => (isWalletMenuOpen = !isWalletMenuOpen)}
                ><span class="h-2 w-2 rounded-full bg-[#2c9b70]"
                ></span>{shortenAddress(walletAddress, 5, 4)}<ChevronDown
                  size={15}
                  strokeWidth={1.8}
                /></button
              >{#if isWalletMenuOpen}<div
                  class="absolute right-0 top-12 z-50 w-56 rounded-xl border border-[#e2e7ef] bg-white p-2 shadow-[0_20px_50px_rgba(23,34,56,0.14)]"
                >
                  <div class="px-3 py-2 text-xs text-[#7b879a]">
                    Connected wallet
                  </div>
                  <div
                    class="break-all px-3 pb-2 font-mono text-xs text-[#33415b]"
                  >
                    {walletAddress}
                  </div>
                  <a
                    class="btn btn-ghost btn-sm w-full justify-start gap-2 text-[#596579]"
                    href={ARC_EXPLORER_URL}
                    target="_blank"
                    rel="noreferrer"
                    ><ExternalLink size={14} />View on explorer</a
                  >
                  <button
                    class="btn btn-ghost btn-sm w-full justify-start gap-2 text-[#596579]"
                    type="button"
                    onclick={handleSwitchAccount}
                    disabled={isConnecting}
                    ><WalletCards size={14} />Switch account</button
                  >
                  <button
                    class="btn btn-ghost btn-sm w-full justify-start gap-2 text-[#b95757] hover:bg-[#fff4f4] hover:text-[#9b3f3f]"
                    type="button"
                    onclick={handleDisconnect}
                    ><LogOut size={14} />Disconnect wallet</button
                  >
                </div>{/if}
            </div>
          {/if}
        </div>
      {:else}
        <a
          href="/docs"
          class="text-sm font-semibold text-[#596579] hover:text-[#2454d6]"
          >Help</a
        >
      {/if}
    </div>
  </header>

  <div class="mx-auto max-w-[1240px]">
    {#if walletAddress}<aside
        class:hidden={!isMobileNavOpen}
        class="fixed inset-x-0 top-[72px] z-30 border-b border-[#e2e7ef] bg-[#f6f8fb] px-5 py-4 shadow-[0_16px_32px_rgba(23,34,56,0.08)] md:hidden"
      >
        <nav aria-label="Main navigation" class="grid gap-1">
          <a
            href="#requests"
            onclick={() => (isMobileNavOpen = false)}
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#33415b] hover:bg-white"
            ><FileCheck2 size={17} strokeWidth={1.8} />Payment requests</a
          >
          <a
            href="#activity"
            onclick={() => (isMobileNavOpen = false)}
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#33415b] hover:bg-white"
            ><Activity size={17} strokeWidth={1.8} />Activity</a
          >
          <a
            href="/docs"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#33415b] hover:bg-white"
            ><ArrowUpRight size={17} strokeWidth={1.8} />Documentation</a
          >
        </nav>
      </aside>{/if}

    <main class="min-w-0 px-5 py-8 lg:px-8 lg:py-10">
      {#if walletAddress}
        <section
          use:revealWorkspace
          id="overview"
          class="hero-copy mx-auto max-w-[1180px]"
        >
          <div
            class="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"
          >
            <div>
              <h1
                class="max-w-[680px] text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-[1.06] tracking-[-0.025em] text-[#172238]"
              >
                Payment overview
              </h1>
              <p
                class="mt-3 max-w-[580px] text-[15px] leading-7 text-[#66758b]"
              >
                Track payment requests and verified USDC settlements on Arc.
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              {#if walletAddress}
                <button
                  class="btn btn-primary h-11 rounded-lg px-5 shadow-[0_8px_18px_rgba(36,84,214,0.18)]"
                  onclick={openCreateRequest}
                  ><Plus size={16} />New request</button
                >
              {/if}
            </div>
          </div>
        </section>
      {/if}
      {#if !walletAddress}
        <WorkspaceEntry
          checking={!sessionChecked}
          {sessionError}
          phase={signInPhase}
          message={walletHint}
          onconnect={handleConnect}
          onretry={checkSession}
        />
      {:else}
        <section
          class="summary-strip mx-auto mt-9 max-w-[1180px] rounded-xl border border-[#e0e6ef] bg-white/85 px-5 py-5 shadow-[0_14px_40px_rgba(23,34,56,0.035)] sm:px-6"
        >
          <div
            class="grid grid-cols-2 divide-x divide-[#edf0f5] sm:grid-cols-4"
          >
            <div class="px-2 sm:px-4">
              <div class="text-xs text-[#7f8a9d]">Outstanding</div>
              <div
                class="mono-numbers mt-2 text-[23px] font-semibold tracking-[-0.015em] text-[#172238]"
              >
                {formatUsdcBaseUnits(totals.outstanding)}
                <span class="text-sm font-medium text-[#7f8a9d]">USDC</span>
              </div>
              <div class="mt-1 text-[11px] text-[#9aa4b5]">
                Awaiting settlement
              </div>
            </div>
            <div class="px-4">
              <div class="text-xs text-[#7f8a9d]">Collected</div>
              <div
                class="mono-numbers mt-2 text-[23px] font-semibold tracking-[-0.015em] text-[#172238]"
              >
                {formatUsdcBaseUnits(totals.collected)}
                <span class="text-sm font-medium text-[#7f8a9d]">USDC</span>
              </div>
              <div
                class="mt-1 flex items-center gap-1 text-[11px] text-[#2b8c67]"
              >
                <Check size={12} />Verified on Arc
              </div>
            </div>
            <div class="px-4">
              <div class="text-xs text-[#7f8a9d]">Settled requests</div>
              <div
                class="mono-numbers mt-2 text-[23px] font-semibold tracking-[-0.015em] text-[#172238]"
              >
                {totals.settled}<span
                  class="ml-1 text-base font-medium text-[#9aa4b5]"
                  >of {requests.length}</span
                >
              </div>
              <div class="mt-1 text-[11px] text-[#9aa4b5]">This workspace</div>
            </div>
            <div class="px-4">
              <div class="text-xs text-[#7f8a9d]">Avg. settlement</div>
              <div
                class="mono-numbers mt-2 text-[23px] font-semibold tracking-[-0.015em] text-[#172238]"
              >
                {averageSettlement}
              </div>
              <div class="mt-1 text-[11px] text-[#9aa4b5]">
                From creation to settlement
              </div>
            </div>
          </div>
          <div
            class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f5] pt-4 text-xs text-[#7f8a9d]"
          >
            <span class="inline-flex items-center gap-2">
              <span class="h-2 w-2 rounded-full bg-[#2c9b70]"></span>
              Arc {ARC_ENVIRONMENT}
            </span>
            <span>
              {#if isLoadingRequests}
                Refreshing payment data…
              {:else if lastUpdatedAt}
                Data refreshed {formatRelative(lastUpdatedAt)}
              {:else}
                Payment data has not been refreshed
              {/if}
            </span>
          </div>
        </section>

        <section
          id="requests"
          class="workspace-panel mx-auto mt-8 max-w-[1180px]"
        >
          <div
            class="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"
          >
            <div>
              <h2
                class="text-[17px] font-semibold tracking-[-0.005em] text-[#172238]"
              >
                Payment requests
              </h2>
              <p class="mt-1 text-sm text-[#7f8a9d]">
                Review balances, due dates and settlement progress.
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <label
                class="input input-sm h-9 w-full max-w-[210px] gap-2 rounded-lg border-[#dfe5ee] bg-white text-[#596579] shadow-none focus-within:border-[#9db2eb] sm:w-[210px]"
                ><Search size={15} strokeWidth={1.8} /><input
                  bind:value={query}
                  aria-label="Search payment requests"
                  placeholder="Search label or reference"
                /></label
              >
              <div class="dropdown dropdown-end">
                <button
                  class="btn btn-ghost btn-sm h-9 gap-2 rounded-lg border border-[#dfe5ee] bg-white px-3 text-xs font-medium text-[#596579] hover:border-[#bdc9dd] hover:bg-white"
                  ><Filter size={14} />{statusFilter}<ChevronDown
                    size={13}
                  /></button
                >
                <ul
                  class="menu dropdown-content z-[1] mt-2 w-44 rounded-xl border border-[#e2e7ef] bg-white p-2 shadow-[0_18px_36px_rgba(23,34,56,0.12)]"
                >
                  {#each ['All', 'Open', 'Partially paid', 'Paid', 'Overpaid'] as filter}<li
                    >
                      <button
                        class:text-[#2454d6]={statusFilter === filter}
                        onclick={() =>
                          selectFilter(filter as 'All' | PaymentStatus)}
                        >{filter}</button
                      >
                    </li>{/each}
                </ul>
              </div>
              {#if requests.length > 0}
                <a
                  href="/api/requests/export"
                  class="btn btn-ghost btn-sm h-9 gap-2 rounded-lg border border-[#dfe5ee] bg-white px-3 text-xs font-semibold text-[#596579] hover:border-[#bdc9dd] hover:bg-white"
                  ><Download size={14} />Export CSV</a
                >
              {/if}
            </div>
          </div>
          <div
            class="overflow-hidden rounded-xl border border-[#e0e6ef] bg-white shadow-[0_14px_40px_rgba(23,34,56,0.035)]"
          >
            <div
              class="hidden grid-cols-[minmax(220px,1.5fr)_120px_120px_145px_145px_28px] items-center gap-4 border-b border-[#edf0f5] bg-[#fbfcfe] px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#7f8a9d] md:grid"
            >
              <div>Request</div>
              <div>Requested</div>
              <div>Received</div>
              <div>Status</div>
              <div>Due</div>
              <div></div>
            </div>
            {#if requestsLoadError}
              <div class="px-6 py-14 text-center" role="alert">
                <div
                  class="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#fff1f1] text-[#a44d4d]"
                >
                  <CircleAlert size={18} />
                </div>
                <h3 class="mt-4 text-sm font-semibold text-[#33415b]">
                  Payment requests could not be loaded
                </h3>
                <p class="mt-1 text-sm text-[#7f8a9d]">{requestsLoadError}</p>
                <button
                  class="btn btn-ghost btn-sm mt-5 gap-2 rounded-lg border border-[#dfe5ee] bg-white"
                  onclick={loadRequests}
                  disabled={isLoadingRequests}
                  ><RefreshCw size={14} />Try again</button
                >
              </div>
            {:else if isLoadingRequests && requests.length === 0}
              <div
                class="flex items-center justify-center gap-3 px-6 py-16 text-sm text-[#66758b]"
              >
                <span class="loading loading-spinner loading-sm text-[#2454d6]"
                ></span>
                Loading payment requests…
              </div>
            {:else if filteredRequests.length === 0}
              <div class="px-6 py-16 text-center">
                <div
                  class="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#eef2f8] text-[#718198]"
                >
                  <Search size={18} />
                </div>
                <h3 class="mt-4 text-sm font-semibold text-[#33415b]">
                  {#if requests.length === 0 && walletAddress}
                    No requests for this wallet
                  {:else}
                    No requests found
                  {/if}
                </h3>
                <p class="mt-1 text-xs text-[#7f8a9d]">
                  {#if requests.length === 0 && walletAddress}
                    Create the first request for this wallet to generate a
                    secure payment link.
                  {:else}
                    Try another search or create a new payment request.
                  {/if}
                </p>
                {#if requests.length === 0 && walletAddress}
                  <button
                    class="btn btn-primary btn-sm mt-5 h-10 rounded-lg px-4"
                    onclick={openCreateRequest}
                    ><Plus size={15} />Create your first request</button
                  >
                {/if}
              </div>
            {:else}
              {#each filteredRequests as request}
                <button
                  class="group grid w-full grid-cols-1 gap-3 border-b border-[#edf0f5] px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-[#fbfcfe] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#2454d6] md:grid-cols-[minmax(220px,1.5fr)_120px_120px_145px_145px_28px] md:items-center md:gap-4"
                  onclick={() => openRequest(request)}
                >
                  <div class="min-w-0">
                    <div class="flex items-center gap-3">
                      <span
                        class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#eef2ff] text-[#2454d6]"
                        ><Link2 size={15} strokeWidth={1.8} /></span
                      ><span class="min-w-0"
                        ><span
                          class="block truncate text-sm font-semibold text-[#33415b]"
                          >{request.title}</span
                        ><span
                          class="mt-1 block truncate text-xs text-[#7f8a9d]"
                          >Reference {requestReference(request)}</span
                        ></span
                      >
                    </div>
                  </div>
                  <div class="flex items-center justify-between md:block">
                    <span class="text-[11px] text-[#9aa4b5] md:hidden"
                      >Amount</span
                    ><span
                      class="mono-numbers text-sm font-semibold text-[#33415b]"
                      >{formatUsdcBaseUnits(amountBase(request))}
                      <span class="text-[11px] font-medium text-[#9aa4b5]"
                        >USDC</span
                      ></span
                    >
                  </div>
                  <div class="flex items-center justify-between md:block">
                    <span class="text-[11px] text-[#9aa4b5] md:hidden"
                      >Received</span
                    ><span
                      class="mono-numbers text-sm font-semibold text-[#33415b]"
                      >{formatUsdcBaseUnits(paidBase(request))}
                      <span class="text-[11px] font-medium text-[#9aa4b5]"
                        >USDC</span
                      ></span
                    >
                  </div>
                  <div class="flex items-center justify-between gap-3 md:block">
                    <span class="text-[11px] text-[#9aa4b5] md:hidden"
                      >Status</span
                    ><StatusChip
                      status={getStatus(request)}
                      closed={Boolean(request.closedAt)}
                    />
                  </div>
                  <div class="flex items-center justify-between md:block">
                    <span class="text-[11px] text-[#9aa4b5] md:hidden">Due</span
                    ><span
                      class:text-[#a44d4d]={isOverdue(request)}
                      class="inline-flex items-center gap-1.5 text-xs font-medium text-[#596579]"
                      ><CalendarDays size={13} />{formatDueDate(
                        request.dueDate
                      )}</span
                    >
                  </div>
                  <div class="hidden justify-end md:flex">
                    <ChevronRight
                      size={17}
                      class="text-[#9aa4b5] transition-colors group-hover:text-[#2454d6]"
                    />
                  </div>
                </button>
              {/each}
            {/if}
          </div>
        </section>

        <section id="activity" class="mx-auto mt-8 max-w-[1180px]">
          <div
            class="rounded-xl border border-[#e0e6ef] bg-white p-5 shadow-[0_14px_40px_rgba(23,34,56,0.035)] sm:p-6"
          >
            <div class="flex items-start justify-between">
              <div>
                <h2
                  class="text-[17px] font-semibold tracking-[-0.005em] text-[#172238]"
                >
                  Settlement activity
                </h2>
                <p class="mt-1 text-xs text-[#7f8a9d]">
                  The latest verified payment events.
                </p>
              </div>
              <div class="rounded-lg bg-[#f0f5ff] p-2 text-[#2454d6]">
                <Activity size={17} />
              </div>
            </div>
            {#if activityItems.length === 0}
              <div
                class="mt-6 rounded-xl border border-dashed border-[#dce3ee] px-5 py-9 text-center"
              >
                <CheckCircle2 size={20} class="mx-auto text-[#9aa4b5]" />
                <p class="mt-3 text-sm font-semibold text-[#596579]">
                  No verified payments yet
                </p>
                <p class="mt-1 text-sm text-[#8994a6]">
                  Verified transfers will appear here with their payer and Arc
                  transaction.
                </p>
              </div>
            {:else}
              <div class="mt-6 divide-y divide-[#edf0f5]">
                {#each activityItems as item}<a
                    href={item.payment.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    class="flex gap-3 rounded-lg py-4 transition-colors hover:bg-[#fbfcfe] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2454d6]"
                  >
                    <div
                      class="ml-2 mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#eaf8f1] text-[#2b8c67]"
                    >
                      <CheckCircle2 size={16} />
                    </div>
                    <div class="min-w-0 flex-1">
                      <div
                        class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
                      >
                        <p
                          class="truncate text-sm font-semibold text-[#33415b]"
                        >
                          {item.request.title}
                        </p>
                        <p
                          class="mono-numbers text-sm font-semibold text-[#2b8c67]"
                        >
                          +{formatUsdcBaseUnits(
                            BigInt(
                              item.payment.amountMicroUsdc ??
                                parseUsdc(item.payment.amount)
                            )
                          )} USDC
                        </p>
                      </div>
                      <div
                        class="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#8c97a8]"
                      >
                        <span>{formatDate(item.payment.receivedAt)}</span><span
                          class="h-1 w-1 rounded-full bg-[#c7cfdb]"
                        ></span><span class="font-mono"
                          >{shortenAddress(item.payment.payer)}</span
                        ><span class="h-1 w-1 rounded-full bg-[#c7cfdb]"
                        ></span><span>Arc transaction</span><ExternalLink
                          size={12}
                        />
                      </div>
                    </div>
                  </a>{/each}
              </div>
            {/if}
          </div>
        </section>
      {/if}
    </main>
  </div>

  <footer
    class="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 border-t border-[#e2e7ef] px-5 pb-8 pt-5 text-xs text-[#8994a6] lg:px-8"
  >
    <span>Settlr v0.1 · Arc {ARC_ENVIRONMENT}</span>
    <div class="flex items-center gap-4">
      <a
        href="/docs"
        class="inline-flex items-center gap-1.5 font-semibold text-[#596579] transition-colors hover:text-[#2454d6]"
        >Integration docs<ArrowUpRight size={13} /></a
      >
    </div>
  </footer>

  {#if selectedRequest}<div
      class="fixed inset-0 z-50 flex items-end justify-end bg-[#172238]/20 p-0 backdrop-blur-[2px] sm:p-5"
      role="presentation"
      onclick={(event) =>
        event.target === event.currentTarget && (selectedRequest = null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-details-title"
        class="h-[min(720px,100vh)] w-full overflow-y-auto border-l border-[#dfe5ee] bg-white p-6 shadow-[-20px_0_50px_rgba(23,34,56,0.12)] sm:max-w-[460px] sm:rounded-xl sm:border"
      >
        <div class="flex items-start justify-between">
          <div>
            <div
              class="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8994a6]"
            >
              Payment request
            </div>
            <h2
              id="request-details-title"
              class="mt-2 text-xl font-semibold tracking-[-0.012em] text-[#172238]"
            >
              {selectedRequest.title}
            </h2>
          </div>
          <button
            class="btn btn-ghost btn-square btn-sm rounded-lg text-[#7f8a9d]"
            aria-label="Close details"
            onclick={() => (selectedRequest = null)}><X size={18} /></button
          >
        </div>
        <div
          class="mt-6 space-y-4 rounded-xl border border-[#dfe5ee] bg-white p-4"
        >
          <label
            for="requester-name"
            class="block text-xs font-semibold text-[#596579]"
          >
            Public requester name
            <input
              id="requester-name"
              class="input mt-2 h-11 w-full rounded-lg border-[#d8e1ee] bg-[#f7f9fc] text-sm text-[#172238] shadow-none focus:border-[#2454d6] focus:bg-white"
              bind:value={requesterNameDraft}
              maxlength="60"
              placeholder="e.g. Northstar Studio"
            />
          </label>
          <label
            for="public-purpose"
            class="block text-xs font-semibold text-[#596579]"
            >Public payment purpose</label
          >
          <input
            id="public-purpose"
            class="input mt-2 h-11 w-full rounded-lg border-[#d8e1ee] bg-[#f7f9fc] text-sm text-[#172238] shadow-none focus:border-[#2454d6] focus:bg-white"
            bind:value={publicDescriptionDraft}
            maxlength="160"
            placeholder="e.g. Website audit, September 2026"
          />
          <div class="grid gap-4 sm:grid-cols-2">
            <label
              for="public-reference"
              class="block text-xs font-semibold text-[#596579]"
            >
              Public reference
              <input
                id="public-reference"
                class="input mt-2 h-11 w-full rounded-lg border-[#d8e1ee] bg-[#f7f9fc] text-sm text-[#172238] shadow-none focus:border-[#2454d6] focus:bg-white"
                bind:value={publicReferenceDraft}
                maxlength="80"
                placeholder="e.g. INV-2026-001"
              />
            </label>
            <label
              for="due-date"
              class="block text-xs font-semibold text-[#596579]"
            >
              Due date
              <input
                id="due-date"
                type="date"
                class="input mt-2 h-11 w-full rounded-lg border-[#d8e1ee] bg-[#f7f9fc] text-sm text-[#172238] shadow-none focus:border-[#2454d6] focus:bg-white"
                bind:value={dueDateDraft}
              />
            </label>
          </div>
          <div
            class="flex items-center justify-between gap-3 border-t border-[#edf0f5] pt-4"
          >
            <p class="text-[11px] leading-5 text-[#8994a6]">
              These details are visible to the payer.
            </p>
            <button
              class="btn btn-primary btn-sm h-9 rounded-lg px-3"
              disabled={isSavingPublicDescription}
              onclick={savePublicDescription}
              >{#if isSavingPublicDescription}<span
                  class="loading loading-spinner loading-xs"
                ></span>{/if}Save</button
            >
          </div>
        </div>
        <div class="mt-6 rounded-xl bg-[#f7f9fc] p-4">
          <div class="text-xs text-[#7f8a9d]">Amount due</div>
          <div
            class="mono-numbers mt-2 text-3xl font-semibold tracking-[-0.02em] text-[#172238]"
          >
            {formatUsdc(selectedRequest.amount)}
            <span class="text-base font-medium text-[#7f8a9d]">USDC</span>
          </div>
          <div
            class="mt-4 flex items-center justify-between border-t border-[#e6ebf2] pt-3 text-xs"
          >
            <span class="text-[#7f8a9d]">Status</span><StatusChip
              status={getStatus(selectedRequest)}
              closed={Boolean(selectedRequest.closedAt)}
            />
          </div>
        </div>
        <div class="mt-6 space-y-4">
          <div>
            <div class="mb-2 text-xs font-semibold text-[#596579]">
              Payment link
            </div>
            <div class="flex items-center gap-2">
              <div
                class="min-w-0 flex-1 truncate rounded-lg border border-[#dfe5ee] bg-white px-3 py-2.5 font-mono text-[11px] text-[#66758b]"
              >
                /pay/{selectedRequest.token}
              </div>
              <button
                class="btn btn-square btn-sm h-10 w-10 rounded-lg border border-[#dfe5ee] bg-white text-[#596579] shadow-none"
                aria-label="Copy payment link"
                onclick={() => copyLink(selectedRequest!)}
                ><Copy size={15} /></button
              >
            </div>
          </div>
          <div>
            <div class="mb-2 text-xs font-semibold text-[#596579]">
              Arc recipient
            </div>
            <div
              class="break-all rounded-lg border border-[#dfe5ee] bg-white px-3 py-2.5 font-mono text-[11px] text-[#66758b]"
            >
              {selectedRequest.recipient}
            </div>
          </div>
        </div>
        <div class="mt-7">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-[#33415b]">
              Verified payments
            </h3>
            <span class="text-xs text-[#8994a6]"
              >{selectedRequest.payments.length}</span
            >
          </div>
          {#if selectedRequest.payments.length === 0}<div
              class="rounded-lg border border-dashed border-[#dce3ee] px-4 py-7 text-center"
            >
              <WalletCards size={20} class="mx-auto text-[#a4afc0]" />
              <p class="mt-2 text-xs text-[#7f8a9d]">
                No payments have been verified yet.
              </p>
            </div>{:else}<div class="space-y-2">
              {#each selectedRequest.payments as payment}<a
                  href={payment.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  class="flex items-center justify-between rounded-lg border border-[#e7ebf1] px-3 py-3 transition-colors hover:border-[#bdc9dd] hover:bg-[#fbfcfe]"
                  ><div>
                    <div
                      class="mono-numbers text-sm font-semibold text-[#33415b]"
                    >
                      {formatUsdc(payment.amount)} USDC
                    </div>
                    <div class="mt-1 font-mono text-[10px] text-[#9aa4b5]">
                      {shortenAddress(payment.transactionHash, 8, 6)}
                    </div>
                  </div>
                  <ExternalLink size={14} class="text-[#8994a6]" /></a
                >{/each}
            </div>{/if}
        </div>
        <div class="mt-7 flex gap-2">
          <a
            class="btn btn-primary btn-sm h-10 flex-1 rounded-lg"
            href={`/pay/${selectedRequest.token}`}
            >Open payment page<ArrowUpRight size={14} /></a
          ><a
            class="btn btn-ghost btn-sm h-10 rounded-lg border border-[#dfe5ee] px-3"
            href={`/receipt/${selectedRequest.token}`}
            aria-label="Open receipt"><FileCheck2 size={15} /></a
          >
        </div>
      </div>
    </div>{/if}

  {#if isCreateOpen}
    <div
      class="fixed inset-0 z-50 grid place-items-center bg-[#172238]/25 p-4 backdrop-blur-[3px]"
      role="presentation"
      onclick={(event) =>
        event.target === event.currentTarget && closeCreateRequest()}
    >
      <div
        bind:this={createDialogElement}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-request-title"
        tabindex="-1"
        onkeydown={handleCreateDialogKeydown}
        class="max-h-[calc(100vh-2rem)] w-full max-w-[600px] overflow-y-auto rounded-2xl border border-[#d6e0ed] bg-[#fcfdff] shadow-[0_24px_80px_rgba(23,34,56,0.2)]"
      >
        <div
          class="flex items-start justify-between gap-5 px-6 pb-5 pt-6 sm:px-7 sm:pt-7"
        >
          <div>
            <div
              class="grid h-9 w-9 place-items-center rounded-xl bg-[#e8efff] text-[#2454d6]"
            >
              <FilePlus2 size={17} />
            </div>
            <h2
              id="new-request-title"
              class="mt-4 text-xl font-semibold tracking-[-0.012em] text-[#172238]"
            >
              New payment request
            </h2>
            <p class="mt-1 max-w-[380px] text-sm leading-6 text-[#6d7b90]">
              Set what the payer sees, then confirm where the USDC will settle.
            </p>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-square btn-sm rounded-lg text-[#7f8a9d] hover:bg-[#eef2f8]"
            aria-label="Close dialog"
            onclick={closeCreateRequest}><X size={18} /></button
          >
        </div>

        <form
          novalidate
          onsubmit={(event) => {
            event.preventDefault();
            void createRequest();
          }}
        >
          <div class="space-y-5 px-6 pb-4 sm:px-7">
            <section aria-labelledby="payer-details-title">
              <div class="mb-4 flex items-center justify-between gap-3">
                <h3
                  id="payer-details-title"
                  class="text-xs font-semibold uppercase tracking-[0.11em] text-[#6f7e95]"
                >
                  Payer facing details
                </h3>
                <span class="text-xs text-[#8994a6]"
                  >Shown on the payment page</span
                >
              </div>

              <div class="space-y-4">
                <label class="block" for="new-requesterName">
                  <span class="mb-2 block text-xs font-semibold text-[#33415b]"
                    >Name shown to payer</span
                  >
                  <span
                    class:border-[#b95757]={Boolean(
                      requestFormErrors.requesterName
                    )}
                    class="flex min-h-12 items-center rounded-xl border-2 border-[#d8e1ee] bg-[#f7f9fc] px-3.5 transition-colors focus-within:border-[#2454d6] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#2454d6]/10"
                  >
                    <input
                      bind:this={requesterNameInput}
                      id="new-requesterName"
                      class="h-10 min-h-0 w-full border-0 bg-transparent px-0 text-sm text-[#172238] shadow-none outline-none placeholder:text-[#9aa4b5] focus:ring-0"
                      bind:value={newRequesterName}
                      oninput={() => clearRequestError('requesterName')}
                      placeholder="e.g. Willow Labs"
                      maxlength="60"
                      autocomplete="organization"
                      required
                      aria-invalid={Boolean(requestFormErrors.requesterName)}
                      aria-describedby={requestFormErrors.requesterName
                        ? 'new-requesterName-error'
                        : undefined}
                    />
                  </span>
                  {#if requestFormErrors.requesterName}<span
                      id="new-requesterName-error"
                      class="mt-2 block text-xs text-[#a44d4d]"
                      >{requestFormErrors.requesterName}</span
                    >{:else}<span class="mt-2 block text-xs text-[#7f8a9d]"
                      >Use the business or person the payer will recognize.</span
                    >{/if}
                </label>

                <label class="block" for="new-publicDescription">
                  <span class="mb-2 block text-xs font-semibold text-[#33415b]"
                    >Payment purpose</span
                  >
                  <span
                    class:border-[#b95757]={Boolean(
                      requestFormErrors.publicDescription
                    )}
                    class="flex min-h-12 items-center rounded-xl border-2 border-[#d8e1ee] bg-[#f7f9fc] px-3.5 transition-colors focus-within:border-[#2454d6] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#2454d6]/10"
                  >
                    <input
                      bind:this={publicDescriptionInput}
                      id="new-publicDescription"
                      class="h-10 min-h-0 w-full border-0 bg-transparent px-0 text-sm text-[#172238] shadow-none outline-none placeholder:text-[#9aa4b5] focus:ring-0"
                      bind:value={newPublicDescription}
                      oninput={() => clearRequestError('publicDescription')}
                      placeholder="e.g. Website audit, September 2026"
                      maxlength="160"
                      required
                      aria-invalid={Boolean(
                        requestFormErrors.publicDescription
                      )}
                      aria-describedby={requestFormErrors.publicDescription
                        ? 'new-publicDescription-error'
                        : undefined}
                    />
                  </span>
                  {#if requestFormErrors.publicDescription}<span
                      id="new-publicDescription-error"
                      class="mt-2 block text-xs text-[#a44d4d]"
                      >{requestFormErrors.publicDescription}</span
                    >{:else}<span class="mt-2 block text-xs text-[#7f8a9d]"
                      >Keep it specific enough to identify the work or order.</span
                    >{/if}
                </label>

                <label class="block" for="new-amount">
                  <span class="mb-2 block text-xs font-semibold text-[#33415b]"
                    >Amount</span
                  >
                  <span
                    class:border-[#b95757]={Boolean(requestFormErrors.amount)}
                    class="flex min-h-12 items-center rounded-xl border-2 border-[#d8e1ee] bg-[#f7f9fc] px-3.5 transition-colors focus-within:border-[#2454d6] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#2454d6]/10"
                  >
                    <input
                      id="new-amount"
                      class="mono-numbers h-10 min-h-0 w-full border-0 bg-transparent px-0 text-base text-[#172238] shadow-none outline-none placeholder:text-[#9aa4b5] focus:ring-0"
                      bind:value={newAmount}
                      oninput={() => clearRequestError('amount')}
                      inputmode="decimal"
                      placeholder="0.00"
                      maxlength="37"
                      required
                      aria-label="Amount in USDC"
                      aria-invalid={Boolean(requestFormErrors.amount)}
                      aria-describedby={requestFormErrors.amount
                        ? 'new-amount-error'
                        : 'new-amount-hint'}
                    />
                    <span
                      class="ml-3 shrink-0 rounded-md bg-[#e9efff] px-2 py-1 text-xs font-bold tracking-[0.06em] text-[#2454d6]"
                      >USDC</span
                    >
                  </span>
                  {#if requestFormErrors.amount}<span
                      id="new-amount-error"
                      class="mt-2 block text-xs text-[#a44d4d]"
                      >{requestFormErrors.amount}</span
                    >{:else}<span
                      id="new-amount-hint"
                      class="mt-2 block text-xs text-[#7f8a9d]"
                      >The amount and recipient cannot be changed after
                      creation.</span
                    >{/if}
                </label>

                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="block" for="new-publicReference">
                    <span
                      class="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-[#33415b]"
                      ><span>Public reference</span><span
                        class="font-medium text-[#8994a6]">Optional</span
                      ></span
                    >
                    <span
                      class="flex min-h-12 items-center rounded-xl border-2 border-[#d8e1ee] bg-[#f7f9fc] px-3.5 transition-colors focus-within:border-[#2454d6] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#2454d6]/10"
                    >
                      <input
                        id="new-publicReference"
                        class="h-10 min-h-0 w-full border-0 bg-transparent px-0 text-sm text-[#172238] shadow-none outline-none placeholder:text-[#9aa4b5] focus:ring-0"
                        bind:value={newPublicReference}
                        placeholder="e.g. INV-2026-001"
                        maxlength="80"
                      />
                    </span>
                  </label>
                  <label class="block" for="new-dueDate">
                    <span
                      class="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-[#33415b]"
                      ><span>Due date</span><span
                        class="font-medium text-[#8994a6]">Optional</span
                      ></span
                    >
                    <span
                      class:border-[#b95757]={Boolean(
                        requestFormErrors.dueDate
                      )}
                      class="flex min-h-12 items-center rounded-xl border-2 border-[#d8e1ee] bg-[#f7f9fc] px-3.5 transition-colors focus-within:border-[#2454d6] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#2454d6]/10"
                    >
                      <input
                        id="new-dueDate"
                        type="date"
                        min={minimumDueDate}
                        class="h-10 min-h-0 w-full border-0 bg-transparent px-0 text-sm text-[#172238] shadow-none outline-none focus:ring-0"
                        bind:value={newDueDate}
                        oninput={() => clearRequestError('dueDate')}
                        aria-invalid={Boolean(requestFormErrors.dueDate)}
                        aria-describedby={requestFormErrors.dueDate
                          ? 'new-dueDate-error'
                          : undefined}
                      />
                    </span>
                    {#if requestFormErrors.dueDate}<span
                        id="new-dueDate-error"
                        class="mt-2 block text-xs text-[#a44d4d]"
                        >{requestFormErrors.dueDate}</span
                      >{/if}
                  </label>
                </div>
              </div>
            </section>

            <details
              class="group rounded-xl border border-[#dfe5ee] bg-white open:shadow-[0_8px_24px_rgba(23,34,56,0.04)]"
            >
              <summary
                class="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2454d6]"
              >
                <span>
                  <span class="block text-sm font-semibold text-[#33415b]"
                    >Internal and settlement details</span
                  >
                  <span class="mt-1 block text-xs text-[#7f8a9d]"
                    >Arc {ARC_ENVIRONMENT} · Connected wallet · Partial payments</span
                  >
                </span>
                <ChevronDown
                  size={16}
                  class="shrink-0 text-[#8994a6] transition-transform group-open:rotate-180"
                />
              </summary>
              <div class="space-y-4 border-t border-[#edf0f5] px-4 pb-4 pt-4">
                <label class="block" for="new-privateLabel">
                  <span
                    class="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-[#33415b]"
                    ><span>Internal label</span><span
                      class="font-medium text-[#8994a6]">Optional</span
                    ></span
                  >
                  <span
                    class="flex min-h-11 items-center rounded-lg border border-[#d8e1ee] bg-[#f7f9fc] px-3 transition-colors focus-within:border-[#2454d6] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#2454d6]/10"
                  >
                    <input
                      id="new-privateLabel"
                      class="h-9 min-h-0 w-full border-0 bg-transparent px-0 text-sm text-[#172238] outline-none placeholder:text-[#9aa4b5] focus:ring-0"
                      bind:value={newTitle}
                      placeholder="Defaults to the payment purpose"
                      maxlength="80"
                    />
                  </span>
                  <span class="mt-2 block text-xs text-[#7f8a9d]"
                    >Only the wallet owner sees this label.</span
                  >
                </label>

                <div class="rounded-lg bg-[#f7f9fc] px-3.5 py-3">
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <div class="text-xs font-semibold text-[#596579]">
                        Recipient wallet
                      </div>
                      <div
                        class="mt-1 truncate font-mono text-xs text-[#33415b]"
                        title={newRecipient}
                      >
                        {shortenAddress(newRecipient, 10, 8)}
                      </div>
                    </div>
                    <button
                      type="button"
                      class="btn btn-ghost btn-square btn-sm shrink-0 rounded-lg text-[#596579]"
                      aria-label="Copy recipient wallet"
                      onclick={copyRecipient}><Copy size={14} /></button
                    >
                  </div>
                  <p
                    class="mt-3 border-t border-[#e6ebf2] pt-3 text-xs leading-5 text-[#7f8a9d]"
                  >
                    Payments settle directly to this wallet. Partial payments
                    are allowed.
                  </p>
                </div>
              </div>
            </details>

            <section
              aria-label="Request preview"
              class="rounded-xl border border-[#cad7f7] bg-[#f2f6ff] px-4 py-3.5"
            >
              <div
                class="text-xs font-semibold uppercase tracking-[0.1em] text-[#2454d6]"
              >
                Payer preview
              </div>
              <p class="mt-2 text-sm leading-6 text-[#33415b]">
                <strong>{newRequesterName.trim() || 'Requester'}</strong>
                requests <strong>{draftAmountLabel()}</strong> for
                <strong
                  >{newPublicDescription.trim() || 'the described work'}</strong
                >.
              </p>
              <p class="mt-2 text-xs leading-5 text-[#6f7e95]">
                The payment link exposes the requester, purpose, amount,
                reference and due date. The internal label stays private.
              </p>
            </section>

            {#if requestFormError}
              <div
                class="flex items-start gap-2 rounded-xl border border-[#efd0d0] bg-[#fff5f5] px-4 py-3 text-sm text-[#934747]"
                role="alert"
              >
                <CircleAlert size={17} class="mt-0.5 shrink-0" />
                <span>{requestFormError}</span>
              </div>
            {/if}
          </div>

          <div
            class="sticky bottom-0 z-10 mt-2 flex items-center justify-end gap-2 border-t border-[#e7ecf3] bg-[#fcfdff]/95 px-6 py-4 backdrop-blur-xl sm:px-7"
          >
            <button
              type="button"
              class="btn btn-ghost h-10 rounded-lg px-4 text-[#596579] hover:bg-[#eef2f8]"
              onclick={closeCreateRequest}>Cancel</button
            >
            <button
              type="submit"
              class="btn h-10 rounded-lg border-[#2454d6] bg-[#2454d6] px-5 text-white shadow-[0_8px_18px_rgba(36,84,214,0.2)] hover:border-[#1f49bb] hover:bg-[#1f49bb]"
              disabled={isLoading}
              >{#if isLoading}<span class="loading loading-spinner loading-xs"
                ></span>{/if}Create request</button
            >
          </div>
        </form>
      </div>
    </div>
  {/if}

  {#if toast}
    <div
      class="toast toast-end toast-bottom z-[60] p-4"
      role="status"
      aria-live="polite"
    >
      <div
        class="alert border border-[#c9d7f6] bg-[#172238] text-white shadow-[0_14px_40px_rgba(23,34,56,0.2)]"
      >
        <CheckCircle2 size={17} class="text-[#9bcbb6]" /><span class="text-sm"
          >{toast}</span
        >
      </div>
    </div>
  {/if}
</div>

<style>
</style>
