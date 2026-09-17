<script lang="ts">
  import '../app.css';

  let { children } = $props();
</script>

<svelte:head>
  <title>MemoMatch | Arc payment control</title>
  <meta name="description" content="Match every USDC payment to the work it settles on Arc." />
  <meta name="theme-color" content="#f6f8fb" />
</svelte:head>

{@render children()}
