<script lang="ts">
  import { onMount } from 'svelte';
  import { animate } from 'animejs';
  import {
    ArrowRight,
    Check,
    CircleAlert,
    FileCheck2,
    LoaderCircle,
    ShieldCheck,
    Signature,
    WalletCards
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
  const connectionComplete = $derived(
    phase === 'signature' || phase === 'verifying'
  );
  const signatureComplete = $derived(phase === 'verifying');
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
      translateY: [3, 0],
      duration: 160,
      ease: 'out(3)'
    });
    return () => animation.revert();
  });

  onMount(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = animate(root.querySelectorAll('.entry-reveal'), {
      opacity: [0, 1],
      translateY: [9, 0],
      duration: 210,
      delay: (_, index) => (index ?? 0) * 35,
      ease: 'out(3)'
    });
    return () => animation.revert();
  });
</script>

<section class="entry" bind:this={root} aria-labelledby="workspace-title">
  <div class="entry-heading entry-reveal">
    <p class="eyebrow">SETTLR WORKSPACE</p>
    <h1 id="workspace-title">Payments, requests and receipts in one place.</h1>
    <p>
      Connect the recipient wallet to create payment links and track verified
      USDC settlements.
    </p>
  </div>

  <div class="entry-stage entry-reveal">
    <div class="stage-ring ring-one"></div>
    <div class="stage-ring ring-two"></div>
    <div class="journey" aria-label="Wallet sign in steps">
      <div
        class:complete={connectionComplete}
        class:active={phase === 'connecting' || phase === 'network'}
      >
        <span
          >{#if connectionComplete}<Check size={13} />{:else}1{/if}</span
        >
        <p>
          <strong>Connect</strong><small>Select the recipient wallet</small>
        </p>
      </div>
      <span class="journey-line" class:complete={connectionComplete}></span>
      <div
        class:complete={signatureComplete}
        class:active={phase === 'signature'}
      >
        <span
          >{#if signatureComplete}<Check size={13} />{:else}2{/if}</span
        >
        <p><strong>Sign</strong><small>Confirm wallet ownership</small></p>
      </div>
      <span class="journey-line" class:complete={signatureComplete}></span>
      <div class:active={phase === 'verifying'}>
        <span>3</span>
        <p><strong>Open</strong><small>Load the private workspace</small></p>
      </div>
    </div>

    <div class="auth-card">
      <div class="auth-copy">
        <span class="auth-icon"><WalletCards size={23} /></span>
        <p class="card-eyebrow">WALLET SIGN IN</p>
        <h2>Open the payment workspace</h2>
        <p>
          Create requests with the wallet that should receive payment. Existing
          requests remain tied to their creating wallet.
        </p>
        {#if ARC_ENVIRONMENT === 'testnet'}<span class="testnet"
            ><span></span>Arc testnet · Test USDC only</span
          >{/if}
      </div>

      <div class="auth-control">
        <div
          class="auth-action"
          bind:this={actionRoot}
          aria-live="polite"
          aria-atomic="true"
        >
          {#if checking}
            <div class="checking" role="status">
              <LoaderCircle size={19} class="spin" /><span
                ><strong>Checking session…</strong><small
                  >Looking for an existing secure sign in.</small
                ></span
              >
            </div>
          {:else if sessionError}
            <div class="error" role="alert">
              <CircleAlert size={19} /><span>{message}</span>
            </div>
            <button class="action-primary" onclick={onretry}
              >Try again <ArrowRight size={18} /></button
            >
          {:else}
            <button class="action-primary" disabled={busy} onclick={onconnect}>
              {#if busy}<LoaderCircle
                  size={19}
                  class="spin"
                />{:else}<WalletCards size={19} />{/if}{phases[phase]}
            </button>
            {#if message && !busy}<div class="error" role="alert">
                <CircleAlert size={19} /><span>{message}</span>
              </div>{/if}
          {/if}
        </div>
        <div class="security-note">
          <ShieldCheck size={18} /><span
            ><strong>No transaction is created</strong><small
              >Signing in uses a wallet message and does not cost a network fee.</small
            ></span
          >
        </div>
        <div class="privacy-line">
          <Signature size={17} /><span
            >Private workspace data appears only after the server verifies the
            signature.</span
          >
        </div>
      </div>
    </div>
  </div>

  <div class="entry-help entry-reveal">
    <div>
      <FileCheck2 size={20} /><span
        ><strong>What happens after sign in?</strong><small
          >Requests, settlement status and receipts load for the verified
          wallet.</small
        ></span
      >
    </div>
    <div class="help-disclosure">
      <Disclosure id="wallet-help" title="No wallet available?"
        >Install MetaMask or Rabby in a supported desktop browser, or open this
        page in a supported mobile wallet browser. Then return here to connect
        and sign in. <a href="/docs" class="help-link"
          >Read the documentation <ArrowRight size={14} /></a
        ></Disclosure
      >
    </div>
  </div>
</section>

<style>
  .entry {
    width: 100%;
    max-width: 1060px;
    margin: 0 auto;
    padding: 30px 0 55px;
  }
  .entry-heading {
    max-width: 700px;
    margin: 0 auto;
    text-align: center;
  }
  .eyebrow,
  .card-eyebrow {
    color: #2454d6;
    font-size: 10px;
    font-weight: 750;
    letter-spacing: 0.14em;
  }
  h1 {
    max-width: 680px;
    margin: 14px auto 0;
    font-size: clamp(36px, 5vw, 56px);
    line-height: 1.04;
    font-weight: 650;
    letter-spacing: -0.03em;
  }
  .entry-heading > p:last-child {
    max-width: 590px;
    margin: 19px auto 0;
    color: #596579;
    font-size: 16px;
    line-height: 1.7;
  }
  .entry-stage {
    position: relative;
    margin-top: 43px;
    padding: 30px 52px 52px;
    overflow: hidden;
    border-radius: 20px;
    background: #c9ddff;
  }
  .stage-ring {
    position: absolute;
    border: 1px solid rgba(255, 255, 255, 0.62);
    border-radius: 50%;
  }
  .ring-one {
    width: 480px;
    height: 480px;
    left: -220px;
    top: -290px;
  }
  .ring-two {
    width: 430px;
    height: 430px;
    right: -210px;
    bottom: -310px;
  }
  .journey {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: auto 1fr auto 1fr auto;
    align-items: center;
    max-width: 720px;
    margin: 0 auto 27px;
  }
  .journey > div {
    display: flex;
    align-items: center;
    gap: 9px;
    color: #486281;
  }
  .journey > div > span {
    display: grid;
    place-items: center;
    width: 25px;
    height: 25px;
    flex: 0 0 auto;
    border: 1px solid rgba(41, 72, 114, 0.25);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.48);
    font-size: 10px;
    font-weight: 750;
    transition: 180ms ease;
  }
  .journey p {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .journey strong {
    font-size: 10px;
  }
  .journey small {
    font-size: 8px;
  }
  .journey > div.active > span {
    color: #fff;
    border-color: #2454d6;
    background: #2454d6;
    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.35);
  }
  .journey > div.complete > span {
    color: #fff;
    border-color: #2c9b70;
    background: #2c9b70;
  }
  .journey-line {
    height: 1px;
    margin: 0 14px;
    background: rgba(41, 72, 114, 0.2);
    transition: background 180ms ease;
  }
  .journey-line.complete {
    background: #2c9b70;
  }
  .auth-card {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    max-width: 850px;
    margin: 0 auto;
    overflow: hidden;
    border: 8px solid rgba(255, 255, 255, 0.58);
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 24px 65px rgba(23, 34, 56, 0.16);
  }
  .auth-copy,
  .auth-control {
    padding: 42px;
  }
  .auth-copy {
    border-right: 1px solid #e6ebf2;
  }
  .auth-icon {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    margin-bottom: 28px;
    border-radius: 12px;
    color: #2454d6;
    background: #eaf0ff;
  }
  .auth-copy h2 {
    margin-top: 11px;
    font-size: 27px;
    line-height: 1.15;
    font-weight: 650;
    letter-spacing: -0.02em;
  }
  .auth-copy > p:nth-of-type(2) {
    margin-top: 15px;
    color: #596579;
    font-size: 13px;
    line-height: 1.7;
  }
  .testnet {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 23px;
    padding: 7px 10px;
    border: 1px solid #d8e2f3;
    border-radius: 999px;
    color: #496584;
    background: #f1f5fc;
    font-size: 10px;
    font-weight: 650;
  }
  .testnet > span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #2c9b70;
  }
  .auth-control {
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: #fcfdff;
  }
  .auth-action {
    min-height: 64px;
  }
  .action-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    width: 100%;
    min-height: 52px;
    padding: 0 16px;
    color: #fff;
    border: 0;
    border-radius: 8px;
    background: #2454d6;
    box-shadow: 0 10px 24px rgba(36, 84, 214, 0.18);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .action-primary:hover:not(:disabled) {
    background: #1d46b5;
  }
  .action-primary:disabled {
    cursor: wait;
    opacity: 0.88;
  }
  .checking {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 11px;
    min-height: 58px;
    padding: 10px;
    color: #445269;
    border: 1px solid #e2e7ef;
    border-radius: 8px;
    background: #f3f6fa;
  }
  .checking > span,
  .security-note > span {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .checking strong,
  .security-note strong {
    font-size: 12px;
  }
  .checking small,
  .security-note small {
    color: #768398;
    font-size: 10px;
  }
  .security-note {
    display: flex;
    gap: 10px;
    margin-top: 23px;
    padding: 14px;
    color: #237453;
    border: 1px solid #d5eadf;
    border-radius: 9px;
    background: #f2faf6;
  }
  .security-note :global(svg) {
    flex: 0 0 auto;
    margin-top: 1px;
  }
  .privacy-line {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin-top: 16px;
    color: #758297;
    font-size: 10px;
    line-height: 1.6;
  }
  .privacy-line :global(svg) {
    flex: 0 0 auto;
    margin-top: 1px;
    color: #2454d6;
  }
  .error {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin-bottom: 12px;
    padding: 13px;
    color: #a63737;
    border: 1px solid #f3d1d1;
    border-radius: 8px;
    background: #fff2f2;
    font-size: 12px;
    line-height: 1.5;
  }
  .error :global(svg) {
    flex: 0 0 auto;
    margin-top: 1px;
  }
  .entry-help {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 45px;
    max-width: 850px;
    margin: 28px auto 0;
  }
  .entry-help > div:first-child {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 20px 0;
  }
  .entry-help > div:first-child :global(svg) {
    flex: 0 0 auto;
    color: #2454d6;
  }
  .entry-help > div:first-child span {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .entry-help strong {
    font-size: 13px;
  }
  .entry-help small {
    color: #6f7c91;
    font-size: 11px;
    line-height: 1.6;
  }
  .help-link {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    color: #2454d6;
    font-weight: 650;
  }
  :global(.spin) {
    animation: entry-spin 1s linear infinite;
  }
  @keyframes entry-spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (max-width: 760px) {
    .entry {
      padding-top: 16px;
    }
    .entry-stage {
      padding: 25px 17px 28px;
    }
    .journey {
      grid-template-columns: repeat(3, 1fr);
      gap: 7px;
    }
    .journey-line {
      display: none;
    }
    .journey > div {
      justify-content: center;
    }
    .journey small {
      display: none;
    }
    .auth-card {
      grid-template-columns: 1fr;
      border-width: 6px;
    }
    .auth-copy,
    .auth-control {
      padding: 28px;
    }
    .auth-copy {
      border-right: 0;
    }
    .auth-control {
      order: -1;
      border-bottom: 1px solid #e6ebf2;
    }
    .auth-icon {
      margin-bottom: 22px;
    }
    .entry-help {
      grid-template-columns: 1fr;
      gap: 0;
    }
  }
  @media (max-width: 420px) {
    h1 {
      font-size: 37px;
    }
    .entry-heading > p:last-child {
      font-size: 14px;
    }
    .journey p {
      display: none;
    }
    .auth-copy,
    .auth-control {
      padding: 24px 20px;
    }
  }
</style>
