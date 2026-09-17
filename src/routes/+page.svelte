<script lang="ts">
  import { onMount } from 'svelte';
  import { animate, createScope } from 'animejs';
  import {
    Activity,
    ArrowUpRight,
    Check,
    CheckCircle2,
    ChevronDown,
    Copy,
    ExternalLink,
    Download,
    FileCheck2,
    FilePlus2,
    Filter,
    LayoutDashboard,
    Link2,
    Menu,
    MoreHorizontal,
    Plus,
    Search,
    ShieldCheck,
    WalletCards,
    X,
    Zap
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
    switchToArc
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
  let isLoading = false;
  let newTitle = '';
  let newAmount = '';
  let newRecipient = '';
  let scopeRoot: HTMLDivElement;

  async function loadRequests() {
    const response = await fetch('/api/requests', { cache: 'no-store' });
    if (!response.ok) {
      requests = [];
      return;
    }
    requests = (await response.json()).requests as PaymentRequest[];
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
      request.token.toLowerCase().includes(query.toLowerCase());
    const status = getStatus(request);
    return matchesQuery && (statusFilter === 'All' || status === statusFilter);
  });

  $: totals = {
    outstanding: requests.reduce((sum, request) => {
      const remaining = amountBase(request) - paidBase(request);
      return sum + (remaining > 0n ? remaining : 0n);
    }, 0n),
    collected: requests.reduce((sum, request) => sum + paidBase(request), 0n),
    paid: requests.filter((request) => getStatus(request) === 'Paid').length
  };

  onMount(() => {
    void fetch('/api/auth/session', { cache: 'no-store' }).then(
      async (response) => {
        const session = (await response.json()) as {
          authenticated?: boolean;
          address?: string;
        };
        if (session.authenticated && session.address) {
          walletAddress = session.address;
          newRecipient = session.address;
          await loadRequests();
        }
      }
    );
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
      walletAddress = '';
      requests = [];
      selectedRequest = null;
      void fetch('/api/auth/logout', { method: 'POST' });
    };
    provider?.on?.('accountsChanged', clearWalletSession);
    provider?.on?.('chainChanged', clearWalletSession);
    const scope = createScope({
      root: scopeRoot,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' }
    }).add((self) => {
      const reduceMotion = self?.matches.reduceMotion ?? false;
      animate('.hero-copy', {
        opacity: [0, 1],
        translateY: [10, 0],
        duration: reduceMotion ? 0 : 420,
        ease: 'out(3)'
      });
      animate('.summary-strip', {
        opacity: [0, 1],
        translateY: [12, 0],
        duration: reduceMotion ? 0 : 480,
        delay: 80,
        ease: 'out(3)'
      });
      animate('#activity', {
        opacity: [0, 1],
        translateY: [14, 0],
        duration: reduceMotion ? 0 : 520,
        delay: 140,
        ease: 'out(3)'
      });
    });
    return () => {
      scope.revert();
      provider?.removeListener?.('accountsChanged', clearWalletSession);
      provider?.removeListener?.('chainChanged', clearWalletSession);
    };
  });

  function getStatus(request: PaymentRequest): PaymentStatus {
    const amount = amountBase(request);
    const paid = paidBase(request);
    if (paid === 0n) return 'Open';
    if (paid < amount) return 'Partially paid';
    if (paid === amount) return 'Paid';
    return 'Overpaid';
  }

  function statusClass(status: PaymentStatus) {
    if (status === 'Paid') return 'status-success';
    if (status === 'Partially paid') return 'status-warning';
    if (status === 'Overpaid') return 'status-info';
    return 'status-neutral';
  }

  function showToast(message: string) {
    toast = message;
    setTimeout(() => (toast = ''), 3600);
  }

  async function handleConnect() {
    try {
      const address = await connectWallet();
      await switchToArc();
      await signInWithEthereum(address);
      walletAddress = address;
      newRecipient = address;
      await loadRequests();
      showToast('Wallet connected to Arc.');
    } catch (error) {
      walletAddress = '';
      showToast(
        error instanceof Error ? error.message : 'Wallet connection failed.'
      );
    }
  }

  function openCreateRequest() {
    if (!walletAddress) {
      showToast('Connect a wallet before creating a request.');
      return;
    }
    newRecipient = walletAddress;
    isCreateOpen = true;
  }

  async function createRequest() {
    let amountBaseUnits = 0n;
    try {
      amountBaseUnits = parseUsdc(newAmount);
    } catch {
      amountBaseUnits = 0n;
    }
    if (!newTitle.trim() || amountBaseUnits <= 0n) {
      showToast('Add a title and a positive USDC amount.');
      return;
    }
    const amount = newAmount.trim();
    isLoading = true;
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          amount,
          recipient: newRecipient
        })
      });
      if (!response.ok) throw new Error('Could not create this request.');
      const payload = await response.json();
      requests = [payload.request, ...requests];
      selectedRequest = payload.request;
      isCreateOpen = false;
      newTitle = '';
      newAmount = '';
      showToast('Payment request created.');
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : 'Could not create this request.'
      );
    } finally {
      isLoading = false;
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
  <title>Overview | MemoMatch</title>
</svelte:head>

<div bind:this={scopeRoot} class="min-h-screen bg-[#f6f8fb] text-[#172238]">
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
      class="mx-auto flex h-[72px] max-w-[1480px] items-center justify-between px-5 lg:px-8"
    >
      <div class="flex items-center gap-3">
        <button
          class="btn btn-ghost btn-square lg:hidden"
          aria-label="Open navigation"
          onclick={() => (isMobileNavOpen = !isMobileNavOpen)}
          ><Menu size={19} strokeWidth={1.8} /></button
        >
        <a href="/" class="flex items-center gap-3" aria-label="MemoMatch home"
          ><span
            class="grid h-9 w-9 place-items-center rounded-[10px] bg-[#172238] text-white shadow-[0_8px_18px_rgba(23,34,56,0.16)]"
            ><svg
              viewBox="0 0 24 24"
              class="h-5 w-5"
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
          ><span class="text-[15px] font-semibold tracking-[-0.02em]"
            >MemoMatch</span
          ></a
        >
      </div>
      <div class="flex items-center gap-2.5">
        {#if walletAddress}
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
                  rel="noreferrer"><ExternalLink size={14} />View on explorer</a
                >
              </div>{/if}
          </div>
        {:else}<button
            class="btn btn-primary btn-sm h-10 rounded-lg px-4 shadow-[0_8px_18px_rgba(36,84,214,0.18)]"
            onclick={handleConnect}>Connect wallet</button
          >{/if}
      </div>
    </div>
  </header>

  <div class="mx-auto flex max-w-[1480px]">
    <aside
      class:hidden={!isMobileNavOpen}
      class="fixed inset-y-[72px] left-0 z-30 w-[248px] border-r border-[#e2e7ef] bg-[#f6f8fb] px-5 py-6 lg:sticky lg:top-[72px] lg:block lg:h-[calc(100vh-72px)] lg:shrink-0 lg:border-r-0 lg:bg-transparent lg:px-6 lg:py-8"
    >
      <nav aria-label="Main navigation" class="flex h-full flex-col">
        <div>
          <div
            class="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8994a6]"
          >
            Workspace
          </div>
          <a
            href="#overview"
            class="flex items-center gap-3 rounded-lg bg-[#e9efff] px-3 py-2.5 text-sm font-semibold text-[#2454d6]"
            ><LayoutDashboard size={17} strokeWidth={1.8} />Overview</a
          ><a
            href="#requests"
            class="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#596579] transition-colors hover:bg-white hover:text-[#172238]"
            ><FileCheck2 size={17} strokeWidth={1.8} />Payment requests</a
          ><a
            href="#activity"
            class="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#596579] transition-colors hover:bg-white hover:text-[#172238]"
            ><Activity size={17} strokeWidth={1.8} />Activity</a
          >
        </div>
        <div class="mt-auto space-y-4">
          <div class="rounded-xl border border-[#dce4f1] bg-white/75 p-4">
            <div
              class="mb-3 flex items-center gap-2 text-xs font-semibold text-[#33415b]"
            >
              <ShieldCheck size={15} class="text-[#2454d6]" />Built for proof
            </div>
            <p class="text-xs leading-5 text-[#748095]">
              Every payment keeps its Arc reference, block and explorer trail.
            </p>
            <a
              href="/docs"
              class="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#2454d6]"
              >Read the docs<ArrowUpRight size={13} /></a
            >
          </div>
          <div class="px-3 text-[11px] text-[#9aa4b5]">
            MemoMatch v0.1 · Arc {ARC_ENVIRONMENT}
          </div>
        </div>
      </nav>
    </aside>

    <main class="min-w-0 flex-1 px-5 py-8 lg:px-10 lg:py-10">
      <section id="overview" class="hero-copy mx-auto max-w-[1180px]">
        <div
          class="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"
        >
          <div>
            <h1
              class="max-w-[680px] text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.055em] text-[#172238]"
            >
              Tie every payment to its work.
            </h1>
            <p class="mt-4 max-w-[580px] text-[15px] leading-7 text-[#66758b]">
              Create a request, share one clean link and let Arc keep the
              settlement trail in view.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button
              class="btn btn-primary h-11 rounded-lg px-5 shadow-[0_8px_18px_rgba(36,84,214,0.18)]"
              onclick={openCreateRequest}><Plus size={16} />New request</button
            >
          </div>
        </div>
      </section>

      <section
        class="summary-strip mx-auto mt-9 max-w-[1180px] rounded-xl border border-[#e0e6ef] bg-white/85 px-5 py-5 shadow-[0_14px_40px_rgba(23,34,56,0.035)] sm:px-6"
      >
        <div class="grid grid-cols-2 divide-x divide-[#edf0f5] sm:grid-cols-4">
          <div class="px-2 sm:px-4">
            <div class="text-xs text-[#7f8a9d]">Outstanding</div>
            <div
              class="mono-numbers mt-2 text-[23px] font-semibold tracking-[-0.04em] text-[#172238]"
            >
              ${formatUsdcBaseUnits(totals.outstanding)}
            </div>
            <div class="mt-1 text-[11px] text-[#9aa4b5]">
              Awaiting settlement
            </div>
          </div>
          <div class="px-4">
            <div class="text-xs text-[#7f8a9d]">Collected</div>
            <div
              class="mono-numbers mt-2 text-[23px] font-semibold tracking-[-0.04em] text-[#172238]"
            >
              ${formatUsdcBaseUnits(totals.collected)}
            </div>
            <div
              class="mt-1 flex items-center gap-1 text-[11px] text-[#2b8c67]"
            >
              <Check size={12} />Verified on Arc
            </div>
          </div>
          <div class="px-4">
            <div class="text-xs text-[#7f8a9d]">Paid requests</div>
            <div
              class="mono-numbers mt-2 text-[23px] font-semibold tracking-[-0.04em] text-[#172238]"
            >
              {totals.paid}<span
                class="ml-1 text-base font-medium text-[#9aa4b5]"
                >/ {requests.length}</span
              >
            </div>
            <div class="mt-1 text-[11px] text-[#9aa4b5]">This workspace</div>
          </div>
          <div class="px-4">
            <div class="text-xs text-[#7f8a9d]">Avg. settlement</div>
            <div
              class="mono-numbers mt-2 text-[23px] font-semibold tracking-[-0.04em] text-[#172238]"
            >
              {requests.length ? 'Calculating' : '—'}
            </div>
            <div class="mt-1 text-[11px] text-[#9aa4b5]">
              From request to final
            </div>
          </div>
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
              class="text-[17px] font-semibold tracking-[-0.02em] text-[#172238]"
            >
              Payment requests
            </h2>
            <p class="mt-1 text-xs text-[#7f8a9d]">
              Private work labels, public payment references.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <label
              class="input input-sm h-9 w-full max-w-[210px] gap-2 rounded-lg border-[#dfe5ee] bg-white text-[#596579] shadow-none focus-within:border-[#9db2eb] sm:w-[210px]"
              ><Search size={15} strokeWidth={1.8} /><input
                bind:value={query}
                aria-label="Search payment requests"
                placeholder="Search requests"
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
          </div>
        </div>
        <div
          class="overflow-hidden rounded-xl border border-[#e0e6ef] bg-white shadow-[0_14px_40px_rgba(23,34,56,0.035)]"
        >
          <div
            class="hidden grid-cols-[minmax(240px,1.7fr)_130px_130px_150px_40px] items-center gap-4 border-b border-[#edf0f5] bg-[#fbfcfe] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#929cad] md:grid"
          >
            <div>Request</div>
            <div>Amount</div>
            <div>Status</div>
            <div>Created</div>
            <div></div>
          </div>
          {#if filteredRequests.length === 0}
            <div class="px-6 py-16 text-center">
              <div
                class="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#eef2f8] text-[#718198]"
              >
                <Search size={18} />
              </div>
              <h3 class="mt-4 text-sm font-semibold text-[#33415b]">
                No requests found
              </h3>
              <p class="mt-1 text-xs text-[#7f8a9d]">
                Try another search or create a new payment request.
              </p>
            </div>
          {:else}
            {#each filteredRequests as request}
              <button
                class="group grid w-full grid-cols-1 gap-3 border-b border-[#edf0f5] px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-[#fbfcfe] md:grid-cols-[minmax(240px,1.7fr)_130px_130px_150px_40px] md:items-center md:gap-4"
                onclick={() => (selectedRequest = request)}
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
                        class="mt-1 block font-mono text-[10px] text-[#9aa4b5]"
                        >{request.token}</span
                      ></span
                    >
                  </div>
                </div>
                <div class="flex items-center justify-between md:block">
                  <span class="text-[11px] text-[#9aa4b5] md:hidden"
                    >Amount</span
                  ><span
                    class="mono-numbers text-sm font-semibold text-[#33415b]"
                    >${formatUsdcBaseUnits(amountBase(request))}
                    <span class="text-[11px] font-medium text-[#9aa4b5]"
                      >USDC</span
                    ></span
                  >
                </div>
                <div class="flex items-center justify-between md:block">
                  <span class="text-[11px] text-[#9aa4b5] md:hidden"
                    >Status</span
                  ><span
                    class={'status-chip ' + statusClass(getStatus(request))}
                    >{getStatus(request)}</span
                  >
                </div>
                <div class="flex items-center justify-between md:block">
                  <span class="text-[11px] text-[#9aa4b5] md:hidden"
                    >Created</span
                  ><span class="text-xs text-[#596579]"
                    >{formatRelative(request.createdAt)}</span
                  >
                </div>
                <div class="hidden justify-end md:flex">
                  <MoreHorizontal
                    size={18}
                    class="text-[#9aa4b5] transition-colors group-hover:text-[#2454d6]"
                  />
                </div>
              </button>
            {/each}
          {/if}
        </div>
      </section>

      <section
        id="activity"
        class="mx-auto mt-8 grid max-w-[1180px] gap-5 lg:grid-cols-[1.4fr_0.8fr]"
      >
        <div
          class="rounded-xl border border-[#e0e6ef] bg-white p-5 shadow-[0_14px_40px_rgba(23,34,56,0.035)] sm:p-6"
        >
          <div class="flex items-start justify-between">
            <div>
              <h2
                class="text-[17px] font-semibold tracking-[-0.02em] text-[#172238]"
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
          <div class="mt-6 space-y-5">
            {#each requests
              .flatMap( (request) => request.payments.map( (payment) => ({ request, payment }) ) )
              .slice(0, 3) as item}<div class="flex gap-3">
                <div
                  class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#eaf8f1] text-[#2b8c67]"
                >
                  <CheckCircle2 size={16} />
                </div>
                <div class="min-w-0 flex-1">
                  <div
                    class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
                  >
                    <p class="truncate text-sm font-semibold text-[#33415b]">
                      {item.request.title}
                    </p>
                    <p
                      class="mono-numbers text-sm font-semibold text-[#2b8c67]"
                    >
                      +${formatUsdcBaseUnits(
                        BigInt(
                          item.payment.amountMicroUsdc ??
                            parseUsdc(item.payment.amount)
                        )
                      )}
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
                    ></span><span class="text-[#2b8c67]">Verified</span>
                  </div>
                </div>
              </div>{/each}
          </div>
        </div>
        <div
          class="relative overflow-hidden rounded-xl border border-[#cad7f7] bg-[#eef3ff] p-5 sm:p-6"
        >
          <div
            class="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#d9e5ff] blur-2xl"
          ></div>
          <div class="relative">
            <div
              class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#2454d6]"
            >
              <Zap size={14} />Arc native flow
            </div>
            <h2
              class="mt-5 max-w-[290px] text-[22px] font-semibold leading-[1.14] tracking-[-0.04em] text-[#172238]"
            >
              A payment trail your whole team can trust.
            </h2>
            <p class="mt-3 max-w-[290px] text-sm leading-6 text-[#596b87]">
              Memo references, final settlement and clear receipts stay together
              from request to close.
            </p>
            <div
              class="mt-6 flex items-center gap-2 text-xs font-semibold text-[#2454d6]"
            >
              <ShieldCheck size={15} />Verified memo trail
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>

  <footer
    class="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3 border-t border-[#e2e7ef] px-5 pb-8 pt-5 text-xs text-[#8994a6] lg:px-8"
  >
    <span>MemoMatch v0.1 · Arc {ARC_ENVIRONMENT}</span>
    <div class="flex items-center gap-4">
      <a
        href="/docs"
        class="inline-flex items-center gap-1.5 font-semibold text-[#596579] transition-colors hover:text-[#2454d6]"
        >Integration docs<ArrowUpRight size={13} /></a
      >
      <a
        href="/api/requests/export"
        class="inline-flex items-center gap-1.5 font-semibold text-[#596579] transition-colors hover:text-[#2454d6]"
        ><Download size={13} />Export CSV</a
      >
    </div>
  </footer>

  {#if selectedRequest}<div
      class="fixed inset-0 z-50 flex items-end justify-end bg-[#172238]/20 p-0 backdrop-blur-[2px] sm:p-5"
      role="presentation"
      onclick={(event) =>
        event.target === event.currentTarget && (selectedRequest = null)}
    >
      <aside
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
              class="mt-2 text-xl font-semibold tracking-[-0.035em] text-[#172238]"
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
        <div class="mt-6 rounded-xl bg-[#f7f9fc] p-4">
          <div class="text-xs text-[#7f8a9d]">Amount due</div>
          <div
            class="mono-numbers mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#172238]"
          >
            ${formatUsdc(selectedRequest.amount)}
            <span class="text-base font-medium text-[#7f8a9d]">USDC</span>
          </div>
          <div
            class="mt-4 flex items-center justify-between border-t border-[#e6ebf2] pt-3 text-xs"
          >
            <span class="text-[#7f8a9d]">Status</span><span
              class={`status-chip ${statusClass(getStatus(selectedRequest))}`}
              >{getStatus(selectedRequest)}</span
            >
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
                      ${formatUsdc(payment.amount)}
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
      </aside>
    </div>{/if}

  {#if isCreateOpen}
    <div
      class="fixed inset-0 z-50 grid place-items-center bg-[#172238]/25 p-4 backdrop-blur-[3px]"
      role="presentation"
      onclick={(event) =>
        event.target === event.currentTarget && (isCreateOpen = false)}
    >
      <div
        class="w-full max-w-[520px] rounded-2xl border border-[#d6e0ed] bg-[#fcfdff] p-6 shadow-[0_24px_80px_rgba(23,34,56,0.2)] sm:p-7"
      >
        <div class="flex items-start justify-between gap-5">
          <div>
            <div
              class="grid h-9 w-9 place-items-center rounded-xl bg-[#e8efff] text-[#2454d6]"
            >
              <FilePlus2 size={17} />
            </div>
            <h2
              class="mt-4 text-xl font-semibold tracking-[-0.035em] text-[#172238]"
            >
              New payment request
            </h2>
            <p class="mt-1 max-w-[380px] text-sm leading-6 text-[#6d7b90]">
              Set the work label, amount and recipient for this Arc payment
              link.
            </p>
          </div>
          <button
            class="btn btn-ghost btn-square btn-sm rounded-lg text-[#7f8a9d] hover:bg-[#eef2f8]"
            aria-label="Close dialog"
            onclick={() => (isCreateOpen = false)}><X size={18} /></button
          >
        </div>

        <div class="mt-7 space-y-4">
          <label class="block">
            <span
              class="mb-2 flex items-center justify-between text-xs font-semibold text-[#33415b]"
              ><span>Private work label</span><span
                class="text-[10px] font-medium uppercase tracking-[0.08em] text-[#9aa4b5]"
                >Required</span
              ></span
            >
            <span
              class="flex min-h-12 items-center rounded-xl border-2 border-[#d8e1ee] bg-[#f7f9fc] px-3.5 transition-colors focus-within:border-[#2454d6] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#2454d6]/10"
            >
              <input
                class="h-10 min-h-0 w-full border-0 bg-transparent px-0 text-sm text-[#172238] shadow-none outline-none placeholder:text-[#9aa4b5] focus:border-transparent focus:outline-none focus:ring-0"
                bind:value={newTitle}
                placeholder="e.g. Arc integration sprint"
              />
            </span>
            <span class="mt-2 block text-[11px] leading-5 text-[#8994a6]"
              >Only the account owner can see this label.</span
            >
          </label>

          <label class="block">
            <span
              class="mb-2 flex items-center justify-between text-xs font-semibold text-[#33415b]"
              ><span>Amount</span><span
                class="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#2454d6]"
                >USDC</span
              ></span
            >
            <span
              class="flex min-h-12 items-center rounded-xl border-2 border-[#d8e1ee] bg-[#f7f9fc] px-3.5 transition-colors focus-within:border-[#2454d6] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#2454d6]/10"
            >
              <input
                class="mono-numbers h-10 min-h-0 w-full border-0 bg-transparent px-0 text-base text-[#172238] shadow-none outline-none placeholder:text-[#9aa4b5] focus:border-transparent focus:outline-none focus:ring-0"
                bind:value={newAmount}
                inputmode="decimal"
                placeholder="0.00"
                aria-label="Amount in USDC"
              />
              <span
                class="ml-3 shrink-0 rounded-md bg-[#e9efff] px-2 py-1 text-[10px] font-bold tracking-[0.08em] text-[#2454d6]"
                >USDC</span
              >
            </span>
            <span class="mt-2 block text-[11px] leading-5 text-[#8994a6]"
              >The amount cannot be changed after creation.</span
            >
          </label>

          <label class="block">
            <span
              class="mb-2 flex items-center justify-between text-xs font-semibold text-[#33415b]"
              ><span>Recipient wallet</span><span
                class="text-[10px] font-medium uppercase tracking-[0.08em] text-[#9aa4b5]"
                >Arc address</span
              ></span
            >
            <span
              class="flex min-h-12 items-center rounded-xl border-2 border-[#d8e1ee] bg-[#f7f9fc] px-3.5 transition-colors focus-within:border-[#2454d6] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#2454d6]/10"
            >
              <input
                class="h-10 min-h-0 w-full border-0 bg-transparent px-0 font-mono text-xs text-[#172238] shadow-none outline-none focus:border-transparent focus:outline-none focus:ring-0"
                bind:value={newRecipient}
                aria-label="Recipient wallet"
                readonly
              />
            </span>
            <span class="mt-2 block text-[11px] leading-5 text-[#8994a6]"
              >Payments settle directly to this address.</span
            >
          </label>
        </div>

        <div
          class="mt-7 flex items-center justify-end gap-2 border-t border-[#e7ecf3] pt-5"
        >
          <button
            class="btn btn-ghost h-10 rounded-lg px-4 text-[#596579] hover:bg-[#eef2f8]"
            onclick={() => (isCreateOpen = false)}>Cancel</button
          >
          <button
            class="btn btn-primary h-10 rounded-lg px-4 shadow-[0_8px_18px_rgba(36,84,214,0.18)]"
            disabled={isLoading}
            onclick={createRequest}
            >{#if isLoading}<span class="loading loading-spinner loading-xs"
              ></span>{/if}Create request</button
          >
        </div>
      </div>
    </div>
  {/if}

  {#if toast}<div class="toast toast-end toast-bottom z-[60] p-4">
      <div
        class="alert border border-[#c9d7f6] bg-[#172238] text-white shadow-[0_14px_40px_rgba(23,34,56,0.2)]"
      >
        <CheckCircle2 size={17} class="text-[#9bcbb6]" /><span class="text-sm"
          >{toast}</span
        >
      </div>
    </div>{/if}
</div>

<style>
  :global(.status-chip) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 5px 9px;
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
</style>
