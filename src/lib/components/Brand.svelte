<script lang="ts">
  let { compact = false }: { compact?: boolean } = $props();
</script>

<a href="/" class:compact class="brand" aria-label="Settlr home">
  <img class="brand-wordmark" src="/settlr-nav-wordmark.svg" alt="Settlr" />
  <img
    class="brand-mark"
    src="/settlr-nav-mark.svg"
    alt=""
    aria-hidden="true"
  />
</a>

<style>
  .brand {
    display: inline-flex;
    align-items: center;
    min-height: 38px;
    text-decoration: none;
    white-space: nowrap;
  }
  .brand-wordmark {
    display: block;
    width: auto;
    height: 34px;
  }
  .brand-mark {
    display: none;
    width: auto;
    height: 38px;
  }
  .brand.compact .brand-wordmark {
    display: none;
  }
  .brand.compact .brand-mark {
    display: block;
  }
  @media (max-width: 640px) {
    .brand:not(.compact) .brand-wordmark {
      display: none;
    }
    .brand:not(.compact) .brand-mark {
      display: block;
    }
  }
</style>
