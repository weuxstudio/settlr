<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { animate } from 'animejs';
  import {
    ArrowRight,
    ArrowUpRight,
    Check,
    CheckCircle2,
    FilePlus2,
    Link2,
    ShieldCheck,
    Fingerprint,
    ReceiptText
  } from 'lucide-svelte';
  import Brand from '$lib/components/Brand.svelte';
  import Disclosure from '$lib/components/Disclosure.svelte';
  import { ARC_ENVIRONMENT } from '$lib/config';
  import { legacyWorkspaceTarget } from '$lib/client/workspace';
  let root: HTMLDivElement;
  onMount(() => {
    const forwardLegacyLink = () => {
      const target = legacyWorkspaceTarget(window.location.hash);
      if (target) void goto(target, { replaceState: true });
    };
    forwardLegacyLink();
    window.addEventListener('hashchange', forwardLegacyLink);
    const animations: ReturnType<typeof animate>[] = [];
    let observer: IntersectionObserver | undefined;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animations.push(
        animate(root.querySelectorAll('.hero-reveal'), {
          opacity: [0, 1],
          translateY: [10, 0],
          duration: 220,
          delay: (_, i) => (i ?? 0) * 35,
          ease: 'out(3)'
        })
      );
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            if (entry.isIntersecting) {
              animations.push(
                animate(entry.target, {
                  opacity: [0, 1],
                  translateY: [10, 0],
                  duration: 220,
                  ease: 'out(3)'
                })
              );
              observer?.unobserve(entry.target);
            }
        },
        { threshold: 0.15 }
      );
      root
        .querySelectorAll('.section-reveal')
        .forEach((el) => observer?.observe(el));
    }
    return () => {
      window.removeEventListener('hashchange', forwardLegacyLink);
      observer?.disconnect();
      animations.forEach((animation) => animation.revert());
    };
  });
</script>

<svelte:head>
  <title>MemoMatch | USDC payments. Clearly matched.</title>
  <meta
    name="description"
    content="Create payment links, match incoming USDC transfers to the right request on Arc, and keep a verifiable receipt."
  />
</svelte:head>

<div class="landing" bind:this={root}>
  <header class="site-header wrap">
    <Brand />
    <nav aria-label="Main navigation">
      <a href="#how-it-works" class="desktop-link">How it works</a>
      <a href="/docs">Docs</a>
      <a href="/app" class="nav-app">Open app <ArrowUpRight size={16} /></a>
    </nav>
  </header>
  <main>
    <section class="hero" aria-labelledby="hero-title">
      <div class="wrap hero-inner">
        <div class="hero-copy hero-reveal">
          <p class="eyebrow">PAYMENT LINKS FOR TEAMS ON ARC</p>
          <h1 id="hero-title">
            USDC payments.<br /><span>Clearly matched.</span>
          </h1>
          <p class="hero-description">
            Create payment links, match incoming transfers to the right request,
            and keep a verifiable receipt. Built for teams receiving USDC on
            Arc.
          </p>
          <div class="hero-actions">
            <a class="action-primary" href="/app?intent=create"
              >Create payment request <ArrowRight size={18} /></a
            >
            <a class="text-link" href="#how-it-works"
              >See how it works <ArrowRight size={16} /></a
            >
          </div>
          <p class="wallet-support">Works with MetaMask and Rabby</p>
          {#if ARC_ENVIRONMENT === 'testnet'}<p class="environment">
              Arc testnet <span>·</span> Test USDC only
            </p>{/if}
        </div>
        <figure
          class="product-example hero-reveal"
          aria-label="Illustrative example of a payment request with a matched partial payment"
        >
          <figcaption>
            <span class="example-dot"></span> Illustrative example
          </figcaption>
          <div class="example-sheet">
            <div class="example-top">
              <span><ReceiptText size={17} /> PAYMENT REQUEST</span><span
                class="reference">INV-001</span
              >
            </div>
            <p class="example-requester">Requested by Willow Studio</p>
            <h2>Website audit</h2>
            <div class="example-amount">120.00 <span>USDC</span></div>
            <div class="example-divider"></div>
            <div class="matched-transfer">
              <span class="match-icon"><Check size={17} /></span>
              <div>
                <strong>Payment matched</strong><span>Reference INV-001</span>
              </div>
              <strong class="transfer-amount">+40.00 <small>USDC</small></strong
              >
            </div>
            <div class="remaining">
              <span>Remaining</span><strong>80.00 USDC</strong>
            </div>
            <div class="example-progress" aria-hidden="true"><span></span></div>
            <div class="example-bottom">
              <span>Partially paid</span><span
                >Each transfer stays traceable</span
              >
            </div>
          </div>
          <div class="example-footnote">
            <Fingerprint size={18} /><span
              >One reference. A clear payment trail.</span
            >
          </div>
        </figure>
      </div>
    </section>

    <section
      class="workflow wrap section-reveal"
      id="how-it-works"
      aria-labelledby="workflow-title"
    >
      <div class="section-heading">
        <p class="eyebrow">FROM REQUEST TO RECEIPT</p>
        <h2 id="workflow-title">One link. Three simple steps.</h2>
      </div>
      <div class="steps">
        <article>
          <span class="step-number">01 <FilePlus2 size={21} /></span>
          <h3>Create a request</h3>
          <p>
            Add a purpose and an amount in USDC. MemoMatch gives the request its
            own payment reference.
          </p>
        </article>
        <article>
          <span class="step-number">02 <Link2 size={21} /></span>
          <h3>Share the link</h3>
          <p>
            The payer reviews the details and sends USDC from their wallet
            directly to yours.
          </p>
        </article>
        <article>
          <span class="step-number">03 <CheckCircle2 size={21} /></span>
          <h3>See what’s settled</h3>
          <p>
            Verified transfers update the balance. Open the receipt to follow
            each payment on Arc.
          </p>
        </article>
      </div>
    </section>

    <section class="clarity-band">
      <div class="wrap clarity section-reveal">
        <div>
          <p class="eyebrow">LESS GUESSWORK</p>
          <h2>The same amount.<br />The right request.</h2>
          <p class="clarity-intro">
            Two requests can have the same amount. Their payment references keep
            incoming transfers distinct.
          </p>
        </div>
        <div class="benefits">
          <article>
            <Fingerprint size={21} />
            <div>
              <h3>A reference for every request</h3>
              <p>
                Match supported memo transfers to their request, without relying
                on the amount alone.
              </p>
            </div>
          </article>
          <article>
            <ReceiptText size={21} />
            <div>
              <h3>A balance that stays clear</h3>
              <p>
                Track partial payments and the remaining amount. Verified
                transfers appear separately on the receipt, with explorer links.
              </p>
            </div>
          </article>
          <article>
            <ShieldCheck size={21} />
            <div>
              <h3>Direct payments, clear boundaries</h3>
              <p>
                Funds go to the recipient wallet. Internal labels stay private;
                payment details are visible to anyone with the link.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="faq wrap section-reveal" aria-labelledby="faq-title">
      <div class="section-heading">
        <p class="eyebrow">BEFORE GETTING STARTED</p>
        <h2 id="faq-title">A few useful details.</h2>
      </div>
      <div class="faq-list">
        <Disclosure id="faq-wallet" title="Which wallet do I need?"
          >MemoMatch works with MetaMask and Rabby in supported desktop browsers
          and mobile wallet browsers. Payers need USDC on the configured Arc
          network, including enough to cover the network fee.</Disclosure
        >
        <Disclosure id="faq-signin" title="Does signing in make a payment?"
          >No. Signing in proves ownership of the wallet by signing a message.
          It does not send a transaction or cost a network fee. Payments require
          a separate confirmation in the payer’s wallet.</Disclosure
        >
        <Disclosure
          id="faq-public"
          title="What can someone with the payment link see?"
          >The requester name, public purpose and reference, recipient wallet,
          amounts, payment status and transfer receipts are public to anyone
          with the link. The internal work label stays in the private workspace.</Disclosure
        >
        <Disclosure id="faq-fees" title="Are there network fees?"
          >Sending a payment requires an Arc network fee paid in USDC. The
          wallet shows the fee before confirmation. Creating a payment request
          does not send an onchain transaction.</Disclosure
        >
      </div>
    </section>

    <section class="closing wrap section-reveal">
      <div>
        <p class="eyebrow">START WITH ONE REQUEST</p>
        <h2>Make the next payment clear.</h2>
      </div>
      <a class="action-primary" href="/app?intent=create"
        >Create payment request <ArrowRight size={18} /></a
      >
    </section>
    <div class="developer-note wrap">
      <span>Building your own payment flow?</span><a href="/docs"
        >Explore the integration docs <ArrowUpRight size={15} /></a
      >
    </div>
  </main>
  <footer class="wrap site-footer">
    <Brand /><span>USDC payment requests on Arc</span><a href="/docs"
      >Documentation</a
    >
  </footer>
</div>

<style>
  .landing {
    color: #172238;
    background: #f6f8fb;
  }
  .wrap {
    width: calc(100% - 64px);
    max-width: 1180px;
    margin: 0 auto;
  }
  .site-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 88px;
    gap: 24px;
  }
  nav {
    display: flex;
    align-items: center;
    gap: 30px;
    font-size: 14px;
    font-weight: 600;
  }
  nav a {
    color: #445269;
  }
  nav a:hover,
  .text-link:hover {
    color: #2454d6;
  }
  .nav-app {
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid #ccd5e3;
    padding: 11px 17px;
    border-radius: 8px;
    background: white;
  }
  .hero {
    border-bottom: 1px solid #e2e7ef;
  }
  .hero-inner {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    align-items: center;
    gap: 64px;
    padding-top: 80px;
    padding-bottom: 94px;
  }
  .eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #2454d6;
    line-height: 1.6;
  }
  h1 {
    font-size: clamp(40px, 4.6vw, 64px);
    font-weight: 650;
    letter-spacing: -0.025em;
    line-height: 1.08;
    margin-top: 22px;
  }
  h1 span {
    color: #2454d6;
  }
  .hero-description {
    font-size: 17px;
    color: #596579;
    line-height: 1.75;
    max-width: 490px;
    margin-top: 26px;
  }
  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 22px;
    margin-top: 30px;
  }
  .text-link {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    font-weight: 600;
    font-size: 14px;
  }
  .wallet-support {
    font-size: 12px;
    color: #596579;
    margin-top: 24px;
  }
  .environment {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #596579;
    margin-top: 7px;
  }
  .environment span {
    color: #8793a6;
  }
  .product-example {
    min-width: 0;
  }
  figcaption {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #657288;
    font-size: 11px;
    margin: 0 0 13px 4px;
  }
  .example-dot {
    width: 5px;
    height: 5px;
    background: #8793a6;
    border-radius: 50%;
  }
  .example-sheet {
    background: white;
    border: 1px solid #dbe3ef;
    border-radius: 16px;
    padding: 30px;
    box-shadow: 0 24px 60px -24px #17223824;
  }
  .example-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: #596579;
    font-size: 10px;
    letter-spacing: 0.08em;
  }
  .example-top > span:first-child {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .reference {
    font-family: var(--font-mono);
    letter-spacing: 0;
    color: #596579;
  }
  .example-requester {
    margin-top: 31px;
    font-size: 12px;
    color: #596579;
  }
  .example-sheet h2 {
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.01em;
    margin-top: 6px;
  }
  .example-amount {
    font-size: 48px;
    line-height: 1.2;
    font-weight: 600;
    letter-spacing: -0.025em;
    font-variant-numeric: tabular-nums;
    margin-top: 19px;
  }
  .example-amount span {
    font-size: 16px;
    letter-spacing: 0;
    font-weight: 500;
    color: #596579;
  }
  .example-divider {
    height: 1px;
    background: #e8edf4;
    margin: 27px 0 23px;
  }
  .matched-transfer {
    display: flex;
    align-items: center;
    gap: 11px;
  }
  .match-icon {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #e9f6ef;
    color: #237453;
    flex-shrink: 0;
  }
  .matched-transfer > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .matched-transfer strong {
    font-size: 13px;
    font-weight: 650;
  }
  .matched-transfer div > span {
    font-size: 11px;
    color: #596579;
  }
  .transfer-amount {
    margin-left: auto;
    color: #237453;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .transfer-amount small {
    font-size: 10px;
    font-weight: 500;
  }
  .remaining {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    margin-top: 31px;
  }
  .remaining span {
    color: #596579;
  }
  .remaining strong {
    font-weight: 600;
  }
  .example-progress {
    height: 4px;
    background: #edf1f7;
    border-radius: 5px;
    margin-top: 12px;
    overflow: hidden;
  }
  .example-progress span {
    display: block;
    height: 100%;
    width: 33.333%;
    background: #2454d6;
  }
  .example-bottom {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 10px;
    color: #596579;
    margin-top: 10px;
  }
  .example-footnote {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    margin-top: 22px;
    color: #596579;
    font-size: 12px;
  }
  .example-footnote :global(svg) {
    color: #2454d6;
  }
  .workflow {
    padding-top: 85px;
    padding-bottom: 90px;
    scroll-margin-top: 24px;
  }
  .section-heading h2,
  .clarity h2,
  .closing h2 {
    font-size: clamp(28px, 3.2vw, 40px);
    font-weight: 600;
    line-height: 1.18;
    letter-spacing: -0.015em;
    margin-top: 14px;
  }
  .steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 48px;
    margin-top: 48px;
  }
  .step-number {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #2454d6;
    font-size: 12px;
    font-weight: 650;
    padding-bottom: 18px;
    border-bottom: 1px solid #d6dfed;
  }
  .steps h3 {
    font-size: 19px;
    font-weight: 600;
    margin: 23px 0 12px;
  }
  .steps p,
  .benefits p {
    font-size: 15px;
    line-height: 1.75;
    color: #596579;
  }
  .clarity-band {
    background: #eef2f8;
    border-top: 1px solid #e2e7ef;
    border-bottom: 1px solid #e2e7ef;
  }
  .clarity {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 100px;
    padding-top: 80px;
    padding-bottom: 80px;
  }
  .clarity-intro {
    max-width: 390px;
    margin-top: 22px;
    font-size: 16px;
    line-height: 1.75;
    color: #596579;
  }
  .benefits {
    display: grid;
    gap: 30px;
  }
  .benefits article {
    display: flex;
    gap: 18px;
  }
  .benefits :global(svg) {
    flex-shrink: 0;
    margin-top: 3px;
    color: #2454d6;
  }
  .benefits h3 {
    font-size: 17px;
    font-weight: 650;
    margin-bottom: 7px;
  }
  .faq {
    display: grid;
    grid-template-columns: 0.85fr 1.15fr;
    gap: 80px;
    padding-top: 90px;
    padding-bottom: 85px;
  }
  .faq-list {
    border-bottom: 1px solid #e2e7ef;
  }
  .closing {
    border-top: 1px solid #dbe3ef;
    padding-top: 55px;
    padding-bottom: 55px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 28px;
  }
  .closing h2 {
    font-size: 32px;
  }
  .developer-note {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 13px;
    color: #596579;
    padding-bottom: 55px;
  }
  .developer-note a {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: #2454d6;
    font-weight: 600;
  }
  .site-footer {
    border-top: 1px solid #e2e7ef;
    padding-top: 26px;
    padding-bottom: 30px;
    display: flex;
    align-items: center;
    gap: 30px;
    font-size: 12px;
    color: #596579;
  }
  .site-footer > a {
    margin-left: auto;
  }
  .site-footer :global(.brand) {
    font-size: 14px;
  }
  .site-footer :global(.brand-mark) {
    width: 30px;
    height: 30px;
    border-radius: 8px;
  }
  @media (max-width: 1000px) {
    .hero-inner {
      gap: 32px;
      padding-top: 52px;
      padding-bottom: 64px;
    }
    .example-sheet {
      padding: 24px;
    }
    .hero-actions {
      gap: 17px;
    }
    .clarity {
      gap: 55px;
    }
    .faq {
      gap: 45px;
    }
    .steps {
      gap: 28px;
    }
  }
  @media (max-width: 760px) {
    .wrap {
      width: calc(100% - 40px);
    }
    .site-header {
      height: 76px;
      gap: 14px;
    }
    nav {
      gap: 16px;
      font-size: 13px;
    }
    .desktop-link {
      display: none;
    }
    .nav-app {
      gap: 6px;
      padding: 9px 12px;
    }
    .hero-inner {
      grid-template-columns: 1fr;
      gap: 42px;
      padding-top: 40px;
      padding-bottom: 50px;
    }
    h1 {
      font-size: clamp(39px, 7vw, 54px);
    }
    .hero-description {
      font-size: 16px;
    }
    .product-example {
      width: 100%;
      max-width: 480px;
      justify-self: center;
    }
    .workflow {
      padding: 55px 0;
    }
    .steps {
      grid-template-columns: 1fr;
      gap: 28px;
      margin-top: 30px;
    }
    .steps h3 {
      margin: 15px 0 8px;
    }
    .clarity {
      grid-template-columns: 1fr;
      gap: 36px;
      padding: 55px 0;
    }
    .faq {
      grid-template-columns: 1fr;
      gap: 32px;
      padding: 55px 0;
    }
    .closing {
      align-items: flex-start;
      flex-direction: column;
      padding: 40px 0;
    }
    .developer-note {
      align-items: flex-start;
      flex-direction: column;
      gap: 7px;
      padding-bottom: 40px;
    }
    .site-footer {
      flex-wrap: wrap;
      gap: 18px;
    }
    .site-footer > span {
      display: none;
    }
  }
  @media (max-width: 380px) {
    .site-header :global(.brand) {
      font-size: 14px;
      gap: 8px;
    }
    .site-header :global(.brand-mark) {
      width: 32px;
      height: 32px;
    }
    nav {
      gap: 11px;
    }
    .example-sheet {
      padding: 20px;
    }
    .example-bottom {
      font-size: 9px;
    }
  }
</style>
