<script lang="ts">
  import { onMount } from 'svelte';
  import { animate } from 'animejs';
  import {
    ArrowRight,
    ShieldCheck,
    WalletCards,
    LoaderCircle,
    CircleAlert
  } from 'lucide-svelte';
  import { ARC_ENVIRONMENT } from '$lib/config';
  import type { SignInPhase } from '$lib/client/workspace';
  import Disclosure from './Disclosure.svelte';
  let {
    checking,
    sessionError,
    phase,
    message,
    onconnect,
    onretry
  }: {
    checking: boolean;
    sessionError: boolean;
    phase: SignInPhase;
    message: string;
    onconnect: () => void;
    onretry: () => void;
  } = $props();
  const phases: Record<SignInPhase, string> = {
    idle: 'Connect wallet',
    connecting: 'Confirm connection in your wallet',
    network: `Switch to Arc ${ARC_ENVIRONMENT} in your wallet`,
    signature: 'Sign the message in your wallet',
    verifying: 'Signing in…'
  };
  const busy = $derived(phase !== 'idle');
  let root: HTMLElement;
  let actionRoot: HTMLDivElement;
  $effect(() => {
    phase;
    checking;
    sessionError;
    if (
      !actionRoot ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const animation = animate(actionRoot, {
      opacity: [0.65, 1],
      duration: 160,
      ease: 'out(3)'
    });
    return () => animation.revert();
  });
  onMount(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = animate(root, {
      opacity: [0, 1],
      translateY: [8, 0],
      duration: 200,
      ease: 'out(3)'
    });
    return () => animation.revert();
  });
</script>

<section class="entry" bind:this={root} aria-labelledby="workspace-title">
  <div class="entry-icon"><WalletCards size={25} strokeWidth={1.6} /></div>
  <p class="eyebrow">MEMOMATCH WORKSPACE</p>
  <h1 id="workspace-title">Open your payment workspace</h1>
  <p class="intro">
    Connect your wallet to create payment links and track incoming USDC
    payments.
  </p>
  {#if ARC_ENVIRONMENT === 'testnet'}<p class="testnet">
      Arc testnet <span>·</span> Test USDC only
    </p>{/if}
  <div
    class="auth-action"
    bind:this={actionRoot}
    aria-live="polite"
    aria-atomic="true"
  >
    {#if checking}
      <div class="checking" role="status">
        <LoaderCircle size={19} class="spin" />Checking session…
      </div>
    {:else if sessionError}
      <div class="error" role="alert">
        <CircleAlert size={19} /><span>{message}</span>
      </div>
      <button class="action-primary" onclick={onretry}
        >Try again<ArrowRight size={18} /></button
      >
    {:else}
      <button class="action-primary" disabled={busy} onclick={onconnect}>
        {#if busy}<LoaderCircle size={19} class="spin" />{:else}<WalletCards
            size={19}
          />{/if}
        {phases[phase]}
      </button>
      {#if message && !busy}<div class="error" role="alert">
          <CircleAlert size={19} /><span>{message}</span>
        </div>{/if}
    {/if}
  </div>
  <p class="signature-note">
    <ShieldCheck size={19} /><span
      >Sign a message to sign in. This does not send a transaction or cost a
      network fee.</span
    >
  </p>
  <p class="account-note">
    Use the wallet that should receive payments. Existing requests belong to the
    wallet that created them.
  </p>
  <Disclosure id="wallet-help" title="No wallet available?">
    Install MetaMask or Rabby in a supported desktop browser, or open this page
    in a supported mobile wallet browser. Then return here to connect and sign
    in.
    <a href="/docs" class="help-link"
      >Read the documentation <ArrowRight size={14} /></a
    >
  </Disclosure>
</section>

<style>
  .entry {
    width: 100%;
    max-width: 480px;
    margin: 0 auto;
    padding: 36px 0 52px;
  }
  .entry-icon {
    display: grid;
    place-items: center;
    width: 54px;
    height: 54px;
    background: #eaf0ff;
    border-radius: 14px;
    color: #2454d6;
    margin-bottom: 30px;
  }
  .eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #596579;
    margin-bottom: 13px;
  }
  h1 {
    font-size: clamp(30px, 5vw, 38px);
    line-height: 1.15;
    font-weight: 650;
    letter-spacing: -0.015em;
    max-width: 410px;
  }
  .intro {
    font-size: 16px;
    line-height: 1.65;
    color: #596579;
    margin-top: 18px;
  }
  .testnet {
    display: inline-flex;
    gap: 9px;
    align-items: center;
    margin-top: 22px;
    padding: 7px 11px;
    border: 1px solid #d6e1f9;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 600;
    color: #34588e;
    background: #eef3fd;
  }
  .auth-action {
    margin: 28px 0 18px;
  }
  .action-primary {
    width: 100%;
    min-height: 52px;
    line-height: 1.4;
  }
  .checking {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: center;
    min-height: 52px;
    color: #596579;
    background: #eef2f8;
    border-radius: 8px;
  }
  .signature-note {
    display: flex;
    gap: 10px;
    color: #596579;
    font-size: 13px;
    line-height: 1.6;
  }
  .signature-note :global(svg) {
    flex-shrink: 0;
    color: #2454d6;
    margin-top: 2px;
  }
  .account-note {
    margin: 24px 0;
    color: #596579;
    font-size: 14px;
    line-height: 1.65;
  }
  .error {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    color: #a63737;
    background: #fff2f2;
    border: 1px solid #f3d1d1;
    border-radius: 8px;
    padding: 13px;
    font-size: 14px;
    line-height: 1.5;
    margin: 12px 0;
  }
  .error :global(svg) {
    flex-shrink: 0;
    margin-top: 2px;
  }
  .help-link {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #2454d6;
    font-weight: 600;
    margin-top: 14px;
  }
  :global(.spin) {
    animation: entry-spin 1s linear infinite;
  }
  @keyframes entry-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
