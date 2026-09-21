<script lang="ts">
  let {
    network = 'testnet',
    compact = false
  }: { network?: string; compact?: boolean } = $props();
</script>

<span class:testnet={network === 'testnet'} class="network-badge">
  <span class="network-dot"></span>
  {#if compact}Arc {network}{:else}Arc {network}
    <span class="network-divider">·</span>
    {network === 'testnet'
      ? 'Test USDC only'
      : 'Verified after confirmation'}{/if}
</span>

<style>
  .network-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 28px;
    border: 1px solid #dce6f2;
    border-radius: 999px;
    background: #ffffff;
    padding: 5px 10px;
    color: #596579;
    font-size: 11px;
    font-weight: 650;
    line-height: 1.2;
  }
  .network-badge.testnet {
    border-color: #ead9ad;
    background: #fff9eb;
    color: #7a5a13;
  }
  .network-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: #2b9b72;
  }
  .testnet .network-dot {
    background: #c58920;
  }
  .network-divider {
    color: #c6a45f;
  }
</style>
