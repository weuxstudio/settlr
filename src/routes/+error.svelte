<script lang="ts">
  import { page } from '$app/stores';
  import { ArrowLeft, CircleAlert, House } from 'lucide-svelte';

  $: status = $page.status || 500;
  $: message = $page.error?.message || 'This page could not be loaded.';
</script>

<svelte:head>
  <title>{status} | Settlr</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="page-error" data-page="error">
  <section class="page-error__panel app-surface" role="alert">
    <div
      class="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#fff4f4] text-[#a44d4d]"
    >
      <CircleAlert size={24} />
    </div>
    <p class="mt-5 font-mono text-xs font-semibold text-[#7f8a9d]">
      Error {status}
    </p>
    <h1>Something went wrong</h1>
    <p>{message}</p>
    <div class="mt-7 flex flex-wrap justify-center gap-2">
      <button
        class="btn btn-ghost app-button app-button-secondary h-11 px-4"
        onclick={() => history.back()}
      >
        <ArrowLeft size={15} />Go back
      </button>
      <a class="btn btn-primary app-button h-11 px-4" href="/">
        <House size={15} />Settlr home
      </a>
    </div>
  </section>
</main>
