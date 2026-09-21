<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { animate } from 'animejs';
  import {
    ArrowRight,
    ArrowUpRight,
    Check,
    CheckCircle2,
    Code2,
    ExternalLink,
    FilePlus2,
    Fingerprint,
    Link2,
    ReceiptText,
    ShieldCheck,
    WalletCards
  } from 'lucide-svelte';
  import Brand from '$lib/components/Brand.svelte';
  import FooterBrand from '$lib/components/FooterBrand.svelte';
  import LogoMark from '$lib/components/LogoMark.svelte';
  import Disclosure from '$lib/components/Disclosure.svelte';
  import { ARC_ENVIRONMENT } from '$lib/config';
  import { legacyWorkspaceTarget } from '$lib/client/workspace';
  import { demoRequests, demoStats } from '$lib/demo-data';
  import { deriveStatus } from '$core/index';
  import { parseUsdc } from '$lib/format';

  const previewStatusClass: Record<string, string> = {
    Open: 'status-open',
    'Partially paid': 'status-partial',
    Paid: 'status-paid',
    Overpaid: 'status-paid'
  };

  function previewStatus(request: (typeof demoRequests)[number]) {
    return deriveStatus(
      BigInt(parseUsdc(request.amount)),
      BigInt(parseUsdc(request.paid))
    );
  }

  function previewDue(value?: string) {
    if (!value) return 'No due date';
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric'
    }).format(new Date(`${value}T12:00:00`));
  }

  function previewDate(value: string) {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(new Date(value));
  }

  function shortAddress(value: string) {
    return `${value.slice(0, 6)}…${value.slice(-4)}`;
  }

  const previewPayments = demoRequests
    .flatMap((request) =>
      request.payments.map((payment) => ({ request, payment }))
    )
    .sort((a, b) => b.payment.blockNumber - a.payment.blockNumber);

  const previewWallet = shortAddress(demoRequests[0].recipient);

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
          translateY: [12, 0],
          duration: 220,
          delay: (_, index) => (index ?? 0) * 35,
          ease: 'out(3)'
        })
      );
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            animations.push(
              animate(entry.target, {
                opacity: [0, 1],
                translateY: [12, 0],
                duration: 220,
                ease: 'out(3)'
              })
            );
            observer?.unobserve(entry.target);
          }
        },
        { threshold: 0.12 }
      );
      root.querySelectorAll('.section-reveal').forEach((element) => {
        (element as HTMLElement).style.opacity = '0';
        observer?.observe(element);
      });
    }
    return () => {
      window.removeEventListener('hashchange', forwardLegacyLink);
      observer?.disconnect();
      animations.forEach((animation) => animation.revert());
    };
  });
</script>

<svelte:head>
  <title>Settlr | USDC payments, clearly matched</title>
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
      <a href="#why-settlr" class="desktop-link">Why Settlr</a>
      <a href="/docs">Docs</a>
      <a href="/app" class="nav-app">Open app <ArrowUpRight size={15} /></a>
    </nav>
  </header>

  <main>
    <section class="hero wrap" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow hero-reveal">PAYMENT LINKS FOR TEAMS ON ARC</p>
        <h1 id="hero-title" class="hero-reveal">
          USDC payments.<br />Clearly matched.
        </h1>
        <p class="hero-description hero-reveal">
          Create payment links, match incoming transfers to the right request,
          and keep a verifiable receipt.
        </p>
        <div class="hero-actions hero-reveal">
          <a class="action-primary" href="/app?intent=create"
            >Create payment request <ArrowRight size={17} /></a
          >
          <a class="action-secondary" href="#how-it-works"
            >See how it works <ArrowRight size={17} /></a
          >
        </div>
        <div class="hero-meta hero-reveal">
          <span>MetaMask and Rabby</span>
          {#if ARC_ENVIRONMENT === 'testnet'}<span class="meta-separator"
            ></span><span>Arc testnet</span><span class="meta-separator"
            ></span><span>Test USDC only</span>{/if}
        </div>
      </div>

      <div
        class="product-stage hero-reveal"
        aria-label="Settlr workspace preview with values from the verified Arc mainnet settlements"
      >
        <div class="stage-orbit orbit-one"></div>
        <div class="stage-orbit orbit-two"></div>
        <figure class="workspace-preview">
          <figcaption>
            <span class="preview-brand"><span class="mini-mark"><LogoMark /></span> Settlr</span>
            <nav class="preview-nav" aria-label="Illustrative workspace navigation"><span class="active">Requests</span><span>Activity</span><span>Documentation</span></nav>
            <span class="preview-actions"><span class="preview-network"><span></span>Arc mainnet</span><span class="preview-wallet"><span></span>{previewWallet} <span class="chevron">⌄</span></span></span>
          </figcaption>
          <div class="preview-main">
            <div class="preview-heading"><div><h2>Payment overview</h2><p>Track payment requests and verified USDC settlements on Arc.</p></div><span class="new-request"><FilePlus2 size={13} />New request</span></div>
            <div class="preview-metrics">
              <div><small>Outstanding</small><strong>{demoStats.outstanding} <span>USDC</span></strong><em>Awaiting settlement</em></div>
              <div><small>Collected</small><strong>{demoStats.collected} <span>USDC</span></strong><em class="verified">✓ Verified on Arc</em></div>
              <div><small>Settled requests</small><strong>{demoStats.paidCount} <span>of {demoRequests.length}</span></strong><em>This workspace</em></div>
              <div><small>Avg. settlement</small><strong>{demoStats.averageSettlement}</strong><em>From request to final</em></div>
            </div>
            <div class="preview-refresh"><span><i></i>Arc mainnet</span><span>Data refreshed just now</span></div>
            <div class="preview-list-heading"><div><h3>Payment requests</h3><p>Review balances, due dates and settlement progress.</p></div><span class="preview-tools">⌕ Search&nbsp;&nbsp; <b>All⌄</b> <b>⇩ CSV</b></span></div>
            <div class="preview-table">
              <div class="table-label"><span>REQUEST</span><span>REQUESTED</span><span>RECEIVED</span><span>STATUS</span><span>DUE</span></div>
              {#each demoRequests as request (request.id)}
                {@const status = previewStatus(request)}
                <div class="table-row"><span class="request-cell"><span class="request-icon"><Link2 size={13} /></span><span><strong>{request.title}</strong><small>Reference {request.publicReference}</small></span></span><strong>{request.amount} <small>USDC</small></strong><strong>{request.paid} <small>USDC</small></strong><span class={previewStatusClass[status]}>● {status}</span><span class="due">{previewDue(request.dueDate)}</span></div>
              {/each}
            </div>
            <div class="preview-activity"><div><h3>Settlement activity</h3><p>The latest verified payment events.</p></div><span class="activity-spark">⌁</span>{#each previewPayments as { request, payment } (payment.id)}<div class="activity-row"><span class="match-check"><Check size={12} /></span><span><strong>{request.title}</strong><small>{previewDate(payment.receivedAt)} · {shortAddress(payment.payer)} · <a href={payment.explorerUrl} target="_blank" rel="noreferrer">Arc transaction ↗</a></small></span><b>+{payment.amount} USDC</b></div>{/each}</div>
          </div>
        </figure>
        <span class="illustrative-label">Interface preview, values from the three verified Arc mainnet settlements</span>
      </div>
    </section>

    <section
      class="process-section wrap section-reveal"
      id="how-it-works"
      aria-labelledby="process-title"
    >
      <div class="section-heading centered">
        <p class="eyebrow">A CLEAR PAYMENT PROCESS</p>
        <h2 id="process-title">Built for work that ends in payment.</h2>
        <p>
          From the first request to the final receipt, each step keeps the
          payment context intact.
        </p>
      </div>
      <div class="process-panel">
        <article>
          <span class="step-number">01</span><FilePlus2 size={21} />
          <h3>Create</h3>
          <p>Set a public purpose, reference and USDC amount.</p>
        </article>
        <article>
          <span class="step-number">02</span><Link2 size={21} />
          <h3>Share</h3>
          <p>Send one payment link with all essential details.</p>
        </article>
        <article>
          <span class="step-number">03</span><Fingerprint size={21} />
          <h3>Match</h3>
          <p>Assign supported transfers through their memo reference.</p>
        </article>
        <article class="process-highlight">
          <span class="step-number">04</span><ReceiptText size={21} />
          <h3>Prove</h3>
          <p>Keep a receipt with each verified Arc transfer.</p>
          <div class="receipt-slip">
            <CheckCircle2 size={17} /><span
              ><strong>120.00 USDC</strong><small>Verified settlement</small
              ></span
            >
          </div>
        </article>
      </div>
    </section>

    <section class="feature-stack wrap" id="why-settlr">
      <article class="feature-row section-reveal">
        <div class="feature-copy">
          <p class="eyebrow">UNIQUE REFERENCES</p>
          <h2>Same amount.<br />Different request.</h2>
          <p>
            Each request receives its own payment reference. Incoming transfers
            are matched by verifiable context instead of amount alone.
          </p>
          <ul>
            <li><Check size={15} />Independent references for every request</li>
            <li>
              <Check size={15} />Private work labels stay in the workspace
            </li>
            <li>
              <Check size={15} />Public details remain visible to the payer
            </li>
          </ul>
        </div>
        <div
          class="feature-visual references-visual"
          aria-label="Two payment requests with the same amount and different references"
        >
          <span class="visual-kicker">PAYMENT REQUESTS</span>
          <div class="reference-card">
            <span class="reference-icon"><Link2 size={16} /></span><span
              ><strong>Website audit</strong><small>INV-001</small></span
            ><strong>120.00 <small>USDC</small></strong>
          </div>
          <div class="reference-card secondary">
            <span class="reference-icon"><Link2 size={16} /></span><span
              ><strong>Design review</strong><small>INV-002</small></span
            ><strong>120.00 <small>USDC</small></strong>
          </div>
          <div class="reference-result">
            <Fingerprint size={17} /><span>Two distinct memo references</span
            ><CheckCircle2 size={17} />
          </div>
        </div>
      </article>

      <article class="feature-row reverse section-reveal">
        <div class="feature-copy">
          <p class="eyebrow">PARTIAL PAYMENTS</p>
          <h2>The balance updates with every verified transfer.</h2>
          <p>
            Part payments stay separate and the remaining amount stays visible.
            The request reaches paid status only after verified funds cover the
            total.
          </p>
          <ul>
            <li>
              <Check size={15} />Requested, received and remaining amounts
            </li>
            <li><Check size={15} />Clear partial and overpaid states</li>
            <li><Check size={15} />No second payment starts automatically</li>
          </ul>
        </div>
        <div
          class="feature-visual partial-visual"
          aria-label="Partial payment progress from 40 to 120 USDC"
        >
          <div class="balance-head">
            <span>Amount remaining</span><strong
              >80.00 <small>USDC</small></strong
            >
          </div>
          <div class="balance-track"><span></span></div>
          <div class="balance-labels">
            <span>40.00 received</span><span>120.00 requested</span>
          </div>
          <div class="transfer-list">
            <div>
              <span class="match-check"><Check size={13} /></span><span
                ><strong>Transfer verified</strong><small
                  >Sep 18, 12:45 PM</small
                ></span
              ><strong>+25.00</strong>
            </div>
            <div>
              <span class="match-check"><Check size={13} /></span><span
                ><strong>Transfer verified</strong><small
                  >Sep 18, 12:48 PM</small
                ></span
              ><strong>+15.00</strong>
            </div>
          </div>
        </div>
      </article>

      <article class="feature-row section-reveal">
        <div class="feature-copy">
          <p class="eyebrow">VERIFIABLE RECEIPTS</p>
          <h2>Every verified transfer remains traceable.</h2>
          <p>
            A public receipt records the reference, total settled amount and
            each verified transfer. Explorer links provide an independent path
            back to Arc.
          </p>
          <ul>
            <li>
              <Check size={15} />One public record for the payment request
            </li>
            <li><Check size={15} />Separate payer, amount and block time</li>
            <li><Check size={15} />Direct links to the Arc explorer</li>
          </ul>
        </div>
        <div
          class="feature-visual receipt-visual"
          aria-label="Verified Settlr settlement receipt"
        >
          <div class="receipt-header">
            <span><CheckCircle2 size={17} /> VERIFIED SETTLEMENT RECORD</span
            ><ReceiptText size={20} />
          </div>
          <h3>Settlement receipt</h3>
          <div class="receipt-summary">
            <div>
              <small>Payment reference</small><strong>0x2772…40bdd</strong>
            </div>
            <div><small>Total settled</small><strong>120.00 USDC</strong></div>
          </div>
          <div class="receipt-transfer">
            <span><strong>0x0053…0298</strong><small>Sep 18, 2026</small></span
            ><strong>120.00 USDC</strong><ExternalLink size={15} />
          </div>
        </div>
      </article>
    </section>

    <section class="trust-section section-reveal">
      <div class="wrap trust-inner">
        <div class="section-heading centered light">
          <p class="eyebrow">DESIGNED FOR PAYMENT PROOF</p>
          <h2>Direct settlement. Verifiable context.</h2>
          <p>
            Settlr connects the payment request, Arc transfer and public receipt
            without taking custody of funds.
          </p>
        </div>
        <div class="trust-facts">
          <article>
            <WalletCards size={22} />
            <h3>Direct to the recipient</h3>
            <p>
              USDC moves from the payer wallet to the configured recipient
              wallet.
            </p>
          </article>
          <article>
            <ShieldCheck size={22} />
            <h3>No private key custody</h3>
            <p>
              Wallet confirmation remains the authorization point for every
              payment.
            </p>
          </article>
          <article>
            <Fingerprint size={22} />
            <h3>Verified on Arc</h3>
            <p>
              Supported memo transfers are checked before they affect a request
              balance.
            </p>
          </article>
        </div>
      </div>
    </section>

    <section
      class="building wrap section-reveal"
      aria-labelledby="building-title"
    >
      <div class="section-heading centered">
        <p class="eyebrow">BUILDING A PAYMENT FLOW</p>
        <h2 id="building-title">Use Settlr at the level that fits.</h2>
        <p>
          Start with the hosted flow or use the verification concepts in a
          dedicated integration.
        </p>
      </div>
      <div class="building-options">
        <a href="/app?intent=create"
          ><span class="option-icon"><Link2 size={22} /></span><span
            ><strong>Hosted payment links</strong><small
              >Create, share and track requests in the Settlr workspace.</small
            ></span
          ><ArrowUpRight size={18} /></a
        >
        <a href="/docs"
          ><span class="option-icon"><Code2 size={22} /></span><span
            ><strong>Integration documentation</strong><small
              >Review the payment preparation and verification architecture.</small
            ></span
          ><ArrowUpRight size={18} /></a
        >
      </div>
    </section>

    <section class="final-cta wrap section-reveal">
      <div class="final-preview" aria-hidden="true">
        <div>
          <span class="match-check"><Check size={13} /></span><span
            ><strong>Request created</strong><small>Reference INV-001</small
            ></span
          >
        </div>
        <ArrowRight size={17} />
        <div>
          <span class="match-check"><Check size={13} /></span><span
            ><strong>Payment matched</strong><small>Verified on Arc</small
            ></span
          >
        </div>
        <ArrowRight size={17} />
        <div>
          <span class="match-check"><Check size={13} /></span><span
            ><strong>Receipt ready</strong><small>Public proof</small></span
          >
        </div>
      </div>
      <div class="final-copy">
        <p class="eyebrow">FROM REQUEST TO RECEIPT</p>
        <h2>Make the next USDC payment clear.</h2>
        <a class="action-primary" href="/app?intent=create"
          >Create payment request <ArrowRight size={17} /></a
        >
      </div>
    </section>

    <section class="faq wrap section-reveal" aria-labelledby="faq-title">
      <div class="section-heading">
        <p class="eyebrow">USEFUL DETAILS</p>
        <h2 id="faq-title">Before getting started.</h2>
      </div>
      <div class="faq-list">
        <Disclosure id="faq-wallet" title="Which wallet is supported?"
          >Settlr works with MetaMask and Rabby in supported desktop browsers
          and mobile wallet browsers. Payers need USDC on the configured Arc
          network and enough USDC to cover the network fee.</Disclosure
        >
        <Disclosure id="faq-signin" title="Does signing in make a payment?"
          >No. Signing in proves ownership of the wallet by signing a message.
          It does not send a transaction or cost a network fee. Payments require
          a separate wallet confirmation.</Disclosure
        >
        <Disclosure id="faq-public" title="Which information is public?"
          >The requester name, public purpose and reference, recipient wallet,
          amounts, payment status and transfer receipts are visible to anyone
          with the link. The internal work label remains private.</Disclosure
        >
        <Disclosure id="faq-fees" title="Are there network fees?"
          >Sending a payment requires an Arc network fee paid in USDC. The
          wallet shows the fee before confirmation. Creating a request does not
          send an onchain transaction.</Disclosure
        >
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="wrap footer-top">
      <div class="footer-brand">
        <FooterBrand />
        <p>USDC payment requests with clear settlement records on Arc.</p>
      </div>
      <div>
        <strong>Product</strong><a href="/app">Open app</a><a
          href="#how-it-works">How it works</a
        >
      </div>
      <div>
        <strong>Developers</strong><a href="/docs">Documentation</a><a
          href="/docs#verification">Verification</a
        >
      </div>
      <div>
        <strong>Network</strong><span>Arc {ARC_ENVIRONMENT}</span><span
          >USDC payments</span
        >
      </div>
    </div>
    <div class="wrap footer-bottom">
      <span>Settlr</span><span
        >Payments go directly to the recipient wallet.</span
      >
    </div>
  </footer>
</div>

<style>
  .landing {
    color: #172238;
    background: #f8f8f5;
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
    min-height: 78px;
    gap: 24px;
  }
  nav {
    display: flex;
    align-items: center;
    gap: 27px;
    font-size: 13px;
    font-weight: 600;
  }
  nav a {
    color: #445269;
  }
  nav a:hover {
    color: #2454d6;
  }
  .nav-app {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 8px;
    color: #fff;
    background: #172238;
  }
  .nav-app:hover {
    color: #fff;
    background: #2454d6;
  }
  .eyebrow {
    color: #2454d6;
    font-size: 10px;
    font-weight: 750;
    line-height: 1.5;
    letter-spacing: 0.14em;
  }
  .hero {
    display: block;
    padding: 76px 0 100px;
  }
  .hero-copy {
    max-width: 750px;
    margin: 0 auto;
    text-align: center;
  }
  h1 {
    margin-top: 18px;
    font-size: clamp(46px, 6.3vw, 76px);
    font-weight: 650;
    line-height: 0.98;
    letter-spacing: -0.035em;
  }
  .hero-description {
    max-width: 600px;
    margin: 25px auto 0;
    color: #596579;
    font-size: 17px;
    line-height: 1.7;
  }
  .hero-actions {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 28px;
  }
  .action-primary,
  .action-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    min-height: 46px;
    padding: 0 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
  }
  .action-primary {
    color: #fff;
    background: #2454d6;
    box-shadow: 0 10px 24px rgba(36, 84, 214, 0.18);
  }
  .action-primary:hover {
    background: #1d46b5;
  }
  .action-secondary {
    color: #172238;
    background: #fff;
    border: 1px solid #d7dee9;
  }
  .action-secondary:hover {
    border-color: #9eb1d0;
  }
  .hero-meta {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 9px;
    margin-top: 18px;
    color: #7a8799;
    font-size: 11px;
  }
  .meta-separator {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #a8b1bf;
  }
  .product-stage {
    position: relative;
    min-height: 510px;
    margin-top: 60px;
    padding: 66px 78px 56px;
    overflow: hidden;
    border-radius: 20px;
    background: #bcd6ff;
  }
  .stage-orbit {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.6);
  }
  .orbit-one {
    width: 560px;
    height: 560px;
    left: -130px;
    top: -270px;
  }
  .orbit-two {
    width: 510px;
    height: 510px;
    right: -170px;
    bottom: -300px;
  }
  .workspace-preview {
    position: relative;
    z-index: 1;
    max-width: 900px;
    margin: 0 auto;
    overflow: hidden;
    border: 9px solid rgba(255, 255, 255, 0.7);
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 24px 70px rgba(23, 34, 56, 0.18);
  }
  .workspace-preview figcaption {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 52px;
    padding: 0 20px;
    border-bottom: 1px solid #e5eaf2;
    font-size: 11px;
    font-weight: 650;
  }
  .preview-brand,
  .preview-wallet {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .mini-mark {
    display: grid;
    place-items: center;
    width: 25px;
    height: 25px;
    border-radius: 7px;
    overflow: hidden;
    background: transparent;
  }
  .preview-wallet {
    color: #596579;
  }
  .preview-wallet > span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #2c9b70;
  }
  .preview-actions,
  .preview-nav {
    display: flex;
    align-items: center;
  }
  .preview-actions {
    gap: 8px;
  }
  .preview-nav {
    gap: 20px;
    margin-left: auto;
    margin-right: 20px;
    color: #66748a;
    font-size: 9px;
  }
  .preview-nav .active {
    color: #172238;
    font-weight: 700;
  }
  .preview-network,
  .preview-wallet {
    min-height: 24px;
    padding: 0 8px;
    border: 1px solid #dce4ef;
    border-radius: 6px;
    font-size: 8px;
  }
  .preview-network {
    color: #52627a;
  }
  .preview-network > span,
  .preview-wallet > span:first-child {
    width: 5px;
    height: 5px;
  }
  .preview-wallet .chevron {
    width: auto;
    height: auto;
    color: #728097;
    background: none;
  }
  .preview-main {
    min-width: 0;
    padding: 24px 29px 26px;
  }
  .preview-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 15px;
  }
  .preview-heading p,
  .preview-list-heading p,
  .preview-activity p {
    margin-top: 4px;
    color: #7a8799;
    font-size: 8px;
  }
  .preview-heading h2 {
    font-size: 19px;
    font-weight: 650;
    letter-spacing: -0.015em;
  }
  .new-request {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    color: #fff;
    border-radius: 6px;
    background: #2454d6;
    font-size: 9px;
    font-weight: 700;
  }
  .preview-metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    margin-top: 19px;
    padding: 15px 0;
    border: 1px solid #e4e9f1;
    border-radius: 8px;
  }
  .preview-metrics > div {
    padding: 0 17px;
    border-right: 1px solid #edf0f5;
  }
  .preview-metrics > div:last-child {
    border: 0;
  }
  .preview-metrics small {
    display: block;
    color: #7f8a9d;
    font-size: 8px;
  }
  .preview-metrics strong {
    display: block;
    margin-top: 5px;
    font-size: 16px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }
  .preview-metrics strong span {
    color: #8894a6;
    font-size: 8px;
    font-weight: 500;
  }
  .preview-metrics em {
    display: block;
    margin-top: 4px;
    color: #8995a7;
    font-size: 7px;
    font-style: normal;
  }
  .preview-metrics em.verified {
    color: #2c9b70;
  }
  .preview-refresh {
    display: flex;
    justify-content: space-between;
    padding: 9px 2px 0;
    color: #7a8799;
    font-size: 7px;
  }
  .preview-refresh span:first-child {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: #43846c;
  }
  .preview-refresh i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #2c9b70;
  }
  .preview-list-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    margin-top: 19px;
  }
  .preview-list-heading h3,
  .preview-activity h3 {
    font-size: 12px;
    font-weight: 700;
  }
  .preview-tools {
    color: #718096;
    font-size: 8px;
    white-space: nowrap;
  }
  .preview-tools b {
    margin-left: 8px;
    padding: 5px 7px;
    border: 1px solid #dce4ef;
    border-radius: 5px;
    color: #5e6d83;
    font-weight: 600;
  }
  .preview-table {
    margin-top: 16px;
    overflow: hidden;
    border: 1px solid #e4e9f1;
    border-radius: 8px;
  }
  .table-label,
  .table-row {
    display: grid;
    grid-template-columns: minmax(210px, 1fr) 78px 78px 102px 54px;
    align-items: center;
    gap: 14px;
    padding: 10px 14px;
  }
  .table-label {
    color: #8c98aa;
    border-bottom: 1px solid #e8edf4;
    font-size: 7px;
    font-weight: 700;
    letter-spacing: 0.1em;
  }
  .table-row {
    font-size: 10px;
  }
  .request-cell {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .request-cell > span:last-child {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .request-cell small,
  .table-row > strong small {
    color: #8c98aa;
    font-size: 8px;
    font-weight: 500;
  }
  .request-icon {
    display: grid;
    place-items: center;
    width: 27px;
    height: 27px;
    border-radius: 6px;
    color: #2454d6;
    background: #eef3ff;
  }
  .status-partial {
    justify-self: start;
    padding: 4px 7px;
    border-radius: 999px;
    color: #9c670e;
    background: #fff3dd;
    font-size: 8px;
    font-weight: 700;
  }
  .status-paid,
  .status-open {
    justify-self: start;
    padding: 4px 7px;
    border-radius: 999px;
    font-size: 7px;
    font-weight: 700;
  }
  .status-paid {
    color: #237453;
    background: #e3f6ed;
  }
  .status-open {
    color: #617087;
    background: #edf1f5;
  }
  .due {
    color: #657288;
    font-size: 8px;
  }
  .preview-activity {
    position: relative;
    margin-top: 17px;
    padding: 13px 14px 12px;
    border: 1px solid #e4e9f1;
    border-radius: 8px;
  }
  .activity-spark {
    position: absolute;
    top: 12px;
    right: 14px;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    color: #2454d6;
    background: #eef3ff;
    font-size: 17px;
  }
  .activity-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 13px;
  }
  .activity-row > span:nth-child(2) {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
  }
  .activity-row strong,
  .activity-row b {
    font-size: 8px;
  }
  .activity-row small {
    color: #7b889a;
    font-size: 7px;
  }
  .activity-row small a {
    color: #2454d6;
    font-weight: 650;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .activity-row b {
    color: #27805d;
  }
  .match-check {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    color: #237453;
    background: #dff4e9;
  }
  .illustrative-label {
    position: relative;
    z-index: 1;
    display: block;
    margin-top: 20px;
    color: #33547f;
    text-align: center;
    font-size: 10px;
    font-weight: 650;
  }
  .process-section {
    padding: 98px 0;
  }
  .section-heading.centered {
    max-width: 650px;
    margin: 0 auto;
    text-align: center;
  }
  .section-heading h2,
  .feature-copy h2,
  .final-copy h2 {
    margin-top: 12px;
    font-size: clamp(32px, 4vw, 46px);
    font-weight: 650;
    line-height: 1.08;
    letter-spacing: -0.025em;
  }
  .section-heading > p:last-child {
    max-width: 590px;
    margin: 18px auto 0;
    color: #596579;
    font-size: 15px;
    line-height: 1.7;
  }
  .process-panel {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-top: 52px;
    padding: 22px;
    border-radius: 18px;
    background: #edf3ff;
  }
  .process-panel article {
    position: relative;
    min-height: 270px;
    padding: 24px;
    overflow: hidden;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.82);
  }
  .process-panel article > :global(svg) {
    margin-top: 38px;
    color: #2454d6;
  }
  .step-number {
    color: #7d8ca3;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.09em;
  }
  .process-panel h3 {
    margin-top: 17px;
    font-size: 18px;
    font-weight: 650;
  }
  .process-panel p {
    margin-top: 8px;
    color: #657288;
    font-size: 13px;
    line-height: 1.65;
  }
  .process-highlight {
    background: #fff !important;
    box-shadow: 0 12px 35px rgba(36, 84, 214, 0.1);
  }
  .receipt-slip {
    position: absolute;
    right: 15px;
    bottom: 16px;
    left: 15px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 11px;
    color: #237453;
    border: 1px solid #d3eadf;
    border-radius: 8px;
    background: #f0faf5;
  }
  .receipt-slip > span {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .receipt-slip strong {
    font-size: 10px;
  }
  .receipt-slip small {
    color: #6a8577;
    font-size: 8px;
  }
  .feature-stack {
    padding: 15px 0 105px;
  }
  .feature-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: center;
    gap: 95px;
    padding: 90px 0;
    border-top: 1px solid #e2e7ef;
  }
  .feature-row.reverse .feature-copy {
    order: 2;
  }
  .feature-row.reverse .feature-visual {
    order: 1;
  }
  .feature-copy h2 {
    max-width: 500px;
  }
  .feature-copy > p:nth-of-type(2) {
    max-width: 485px;
    margin-top: 22px;
    color: #596579;
    font-size: 15px;
    line-height: 1.75;
  }
  .feature-copy ul {
    display: grid;
    gap: 0;
    margin-top: 27px;
  }
  .feature-copy li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 0;
    color: #445269;
    border-top: 1px solid #e3e8ef;
    font-size: 13px;
  }
  .feature-copy li :global(svg) {
    flex: 0 0 auto;
    color: #2454d6;
  }
  .feature-visual {
    min-width: 0;
    min-height: 430px;
    padding: 45px;
    border-radius: 18px;
    background: #d8e7ff;
  }
  .visual-kicker {
    display: block;
    margin-bottom: 22px;
    color: #58749b;
    font-size: 9px;
    font-weight: 750;
    letter-spacing: 0.13em;
  }
  .references-visual {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .reference-card {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 19px;
    border: 1px solid #dce4ef;
    border-radius: 11px;
    background: #fff;
    box-shadow: 0 14px 35px rgba(23, 34, 56, 0.1);
  }
  .reference-card.secondary {
    margin-top: 13px;
    transform: translateX(22px);
  }
  .reference-card > span:nth-child(2) {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .reference-card strong {
    font-size: 13px;
  }
  .reference-card small {
    color: #7e8a9c;
    font-size: 9px;
    font-weight: 500;
  }
  .reference-icon {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    color: #2454d6;
    background: #eef3ff;
  }
  .reference-result {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 24px auto 0;
    padding: 9px 13px;
    color: #2454d6;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.72);
    font-size: 10px;
    font-weight: 700;
  }
  .partial-visual {
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: #d9f0e7;
  }
  .balance-head {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .balance-head span {
    color: #587168;
    font-size: 11px;
  }
  .balance-head strong {
    font-size: 43px;
    font-weight: 650;
    letter-spacing: -0.03em;
  }
  .balance-head small {
    color: #6e837c;
    font-size: 12px;
  }
  .balance-track {
    height: 8px;
    margin-top: 26px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.75);
  }
  .balance-track span {
    display: block;
    width: 33.333%;
    height: 100%;
    background: #2c9b70;
  }
  .balance-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 9px;
    color: #587168;
    font-size: 9px;
  }
  .transfer-list {
    display: grid;
    gap: 8px;
    margin-top: 29px;
  }
  .transfer-list > div {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.82);
  }
  .transfer-list div > span:nth-child(2) {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 3px;
  }
  .transfer-list strong {
    font-size: 10px;
  }
  .transfer-list small {
    color: #71877d;
    font-size: 8px;
  }
  .receipt-visual {
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: #e8e0ff;
  }
  .receipt-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #5c45aa;
  }
  .receipt-header > span {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 8px;
    font-weight: 750;
    letter-spacing: 0.09em;
  }
  .receipt-visual h3 {
    margin-top: 20px;
    font-size: 23px;
    font-weight: 650;
  }
  .receipt-summary {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    margin-top: 22px;
    border-top: 1px solid rgba(92, 69, 170, 0.17);
    border-bottom: 1px solid rgba(92, 69, 170, 0.17);
  }
  .receipt-summary > div {
    padding: 18px 0;
  }
  .receipt-summary > div + div {
    padding-left: 20px;
    border-left: 1px solid rgba(92, 69, 170, 0.17);
  }
  .receipt-summary small,
  .receipt-transfer small {
    display: block;
    color: #786b9d;
    font-size: 8px;
  }
  .receipt-summary strong {
    display: block;
    margin-top: 5px;
    font-family: var(--font-mono);
    font-size: 10px;
  }
  .receipt-transfer {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 20px;
    padding: 15px;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.75);
  }
  .receipt-transfer > span {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 3px;
  }
  .receipt-transfer strong {
    font-size: 10px;
  }
  .receipt-transfer > :global(svg) {
    color: #5c45aa;
  }
  .trust-section {
    padding: 95px 0;
    color: #fff;
    background: #2454d6;
  }
  .section-heading.light .eyebrow {
    color: #bfd1ff;
  }
  .section-heading.light > p:last-child {
    color: #dce6ff;
  }
  .trust-facts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-top: 50px;
  }
  .trust-facts article {
    padding: 29px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 13px;
    background: rgba(255, 255, 255, 0.08);
  }
  .trust-facts article :global(svg) {
    color: #d7e4ff;
  }
  .trust-facts h3 {
    margin-top: 35px;
    font-size: 17px;
    font-weight: 650;
  }
  .trust-facts p {
    margin-top: 10px;
    color: #dce6ff;
    font-size: 13px;
    line-height: 1.65;
  }
  .building {
    padding: 100px 0;
  }
  .building-options {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    max-width: 860px;
    margin: 45px auto 0;
  }
  .building-options a {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 110px;
    padding: 22px;
    border: 1px solid #dfe5ee;
    border-radius: 12px;
    background: #fff;
  }
  .building-options a:hover {
    border-color: #9eb2d3;
    box-shadow: 0 12px 32px rgba(23, 34, 56, 0.06);
  }
  .building-options a > span:nth-child(2) {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 6px;
  }
  .building-options strong {
    font-size: 15px;
  }
  .building-options small {
    color: #68758a;
    font-size: 12px;
    line-height: 1.55;
  }
  .building-options a > :global(svg) {
    color: #7b8799;
  }
  .option-icon {
    display: grid;
    place-items: center;
    width: 43px;
    height: 43px;
    flex: 0 0 auto;
    border-radius: 10px;
    color: #2454d6;
    background: #edf3ff;
  }
  .final-cta {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    align-items: center;
    gap: 70px;
    padding: 72px;
    border-radius: 18px;
    background: #edf3ff;
  }
  .final-preview {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .final-preview > div {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
    padding: 13px;
    border: 1px solid #dce4ef;
    border-radius: 9px;
    background: #fff;
  }
  .final-preview > div > span:nth-child(2) {
    display: flex;
    flex-direction: column;
    gap: 2px;
    white-space: nowrap;
  }
  .final-preview strong {
    font-size: 9px;
  }
  .final-preview small {
    color: #79869a;
    font-size: 7px;
  }
  .final-preview > :global(svg) {
    flex: 0 0 auto;
    color: #8a98ab;
  }
  .final-copy .action-primary {
    margin-top: 25px;
  }
  .faq {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    gap: 85px;
    padding: 105px 0;
  }
  .faq-list {
    border-bottom: 1px solid #e2e7ef;
  }
  .site-footer {
    color: #dbe4f2;
    background: #101d33;
  }
  .footer-top {
    display: grid;
    grid-template-columns: 2fr repeat(3, 1fr);
    gap: 70px;
    padding-top: 70px;
    padding-bottom: 62px;
  }
  .footer-brand p {
    max-width: 280px;
    margin-top: 18px;
    color: #9cabc0;
    font-size: 13px;
    line-height: 1.65;
  }
  .footer-top > div:not(.footer-brand) {
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-size: 12px;
  }
  .footer-top strong {
    margin-bottom: 5px;
    color: #fff;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .footer-top a,
  .footer-top span {
    color: #9cabc0;
  }
  .footer-top a:hover {
    color: #fff;
  }
  .footer-bottom {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    padding-top: 20px;
    padding-bottom: 25px;
    color: #7f90a8;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 11px;
  }
  @media (max-width: 920px) {
    .product-stage {
      padding: 50px 35px 42px;
    }
    .process-panel {
      grid-template-columns: repeat(2, 1fr);
    }
    .feature-row {
      gap: 50px;
    }
    .feature-visual {
      min-height: 390px;
      padding: 32px;
    }
    .final-cta {
      grid-template-columns: 1fr;
      gap: 42px;
      padding: 52px;
    }
    .footer-top {
      grid-template-columns: 1.6fr repeat(3, 1fr);
      gap: 35px;
    }
  }
  @media (max-width: 720px) {
    .wrap {
      width: calc(100% - 40px);
    }
    .site-header {
      min-height: 72px;
    }
    nav {
      gap: 15px;
    }
    .desktop-link {
      display: none;
    }
    .nav-app {
      padding: 9px 11px;
    }
    .hero {
      padding: 55px 0 70px;
    }
    h1 {
      font-size: clamp(42px, 12vw, 62px);
    }
    .hero-description {
      font-size: 15px;
    }
    .product-stage {
      min-height: auto;
      margin-top: 45px;
      padding: 28px 18px 30px;
      border-radius: 16px;
    }
    .workspace-preview {
      border-width: 6px;
    }
    .preview-nav {
      display: none;
    }
    .preview-actions {
      margin-left: auto;
    }
    .preview-main {
      padding: 21px 18px;
    }
    .preview-heading h2 {
      font-size: 17px;
    }
    .preview-heading p {
      max-width: 210px;
      line-height: 1.4;
    }
    .new-request {
      display: none;
    }
    .preview-metrics > div {
      padding: 0 9px;
    }
    .preview-metrics strong {
      font-size: 12px;
    }
    .table-label,
    .table-row {
      grid-template-columns: minmax(150px, 1fr) 64px 64px;
    }
    .table-label span:nth-child(4),
    .table-label span:nth-child(5),
    .table-row > :nth-child(4),
    .table-row > :nth-child(5) {
      display: none;
    }
    .preview-list-heading {
      align-items: flex-start;
    }
    .preview-tools {
      display: none;
    }
    .preview-activity {
      display: none;
    }
    .process-section {
      padding: 70px 0;
    }
    .process-panel {
      grid-template-columns: 1fr;
      padding: 14px;
    }
    .process-panel article {
      min-height: 220px;
    }
    .feature-stack {
      padding-bottom: 65px;
    }
    .feature-row,
    .feature-row.reverse {
      grid-template-columns: 1fr;
      gap: 35px;
      padding: 65px 0;
    }
    .feature-row.reverse .feature-copy,
    .feature-row.reverse .feature-visual {
      order: initial;
    }
    .feature-visual {
      min-height: 370px;
      padding: 27px;
    }
    .reference-card.secondary {
      transform: none;
    }
    .trust-section {
      padding: 70px 0;
    }
    .trust-facts {
      grid-template-columns: 1fr;
    }
    .building {
      padding: 70px 0;
    }
    .building-options {
      grid-template-columns: 1fr;
    }
    .final-cta {
      width: calc(100% - 40px);
      padding: 38px 25px;
    }
    .final-preview {
      flex-direction: column;
      align-items: stretch;
    }
    .final-preview > :global(svg) {
      transform: rotate(90deg);
      align-self: center;
    }
    .faq {
      grid-template-columns: 1fr;
      gap: 35px;
      padding: 75px 0;
    }
    .footer-top {
      grid-template-columns: 1fr 1fr;
      gap: 42px 25px;
      padding-top: 55px;
    }
    .footer-brand {
      grid-column: 1 / -1;
    }
    .footer-bottom {
      flex-direction: column;
    }
  }
  @media (max-width: 390px) {
    .site-header :global(.brand) {
      font-size: 14px;
      gap: 8px;
    }
    .site-header :global(.brand-mark) {
      height: 32px;
      width: auto;
    }
    nav > a:first-of-type {
      display: none;
    }
    .action-primary,
    .action-secondary {
      width: 100%;
    }
    .workspace-preview figcaption {
      padding: 0 12px;
    }
    .preview-wallet {
      display: none;
    }
    .preview-metrics {
      grid-template-columns: repeat(2, 1fr);
    }
    .preview-metrics > div:nth-child(3) {
      display: none;
    }
    .preview-metrics > div:nth-child(2) {
      border: 0;
    }
    .feature-visual {
      min-height: 340px;
      padding: 22px;
    }
    .reference-card {
      padding: 14px;
    }
    .receipt-summary {
      grid-template-columns: 1fr;
    }
    .receipt-summary > div + div {
      padding-left: 0;
      border-left: 0;
      border-top: 1px solid rgba(92, 69, 170, 0.17);
    }
    .footer-top {
      grid-template-columns: 1fr;
    }
    .footer-brand {
      grid-column: auto;
    }
  }
</style>
