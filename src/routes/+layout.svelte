<script lang="ts">
  import '../app.css';

  let { children } = $props();
</script>

<svelte:head>
  <title>Settlr | Arc payment control</title>
  <meta
    name="description"
    content="Match every USDC payment to the work it settles on Arc."
  />
  <meta name="theme-color" content="#f8f8f5" />
</svelte:head>

{@render children()}
