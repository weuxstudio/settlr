<script lang="ts">
  import LogoMark from '$lib/components/LogoMark.svelte';
</script>

<a href="/" class="brand" aria-label="Settlr home">
  <span class="brand-mark"><LogoMark /></span>
  <span>Settlr</span>
</a>

<style>
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-size: 17px;
    font-weight: 700;
    color: #172238;
    text-decoration: none;
    white-space: nowrap;
  }
  .brand-mark {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 11px;
    overflow: hidden;
    background: transparent;
  }
</style>
