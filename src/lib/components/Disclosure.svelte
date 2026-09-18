<script lang="ts">
  import { tick, onDestroy, type Snippet } from 'svelte';
  import { animate } from 'animejs';
  import { ChevronDown } from 'lucide-svelte';
  let {
    id,
    title,
    children
  }: { id: string; title: string; children: Snippet } = $props();
  let open = $state(false);
  let rendered = $state(false);
  let panel: HTMLDivElement;
  let animation: ReturnType<typeof animate> | undefined;
  async function toggle() {
    animation?.pause();
    open = !open;
    rendered = true;
    await tick();
    const expanded = open;
    animation = animate(panel, {
      height: [
        panel.getBoundingClientRect().height,
        expanded ? panel.scrollHeight : 0
      ],
      opacity: expanded ? 1 : 0,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : 190,
      ease: 'out(3)',
      onComplete: () => {
        if (open !== expanded) return;
        panel.style.height = expanded ? 'auto' : '0px';
        if (!expanded) rendered = false;
      }
    });
  }
  onDestroy(() => animation?.revert());
</script>

<div class="disclosure">
  <button
    type="button"
    aria-expanded={open}
    aria-controls={id}
    onclick={toggle}
  >
    <span>{title}</span><ChevronDown size={17} class={open ? 'rotated' : ''} />
  </button>
  <div
    bind:this={panel}
    {id}
    class="panel"
    hidden={!rendered}
    inert={!open}
    style="height:0px"
  >
    <div class="content">{@render children()}</div>
  </div>
</div>

<style>
  .disclosure {
    border-top: 1px solid #e2e7ef;
  }
  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    width: 100%;
    padding: 22px 0;
    text-align: left;
    font-size: 16px;
    font-weight: 600;
    color: #172238;
    cursor: pointer;
    background: none;
    border: 0;
  }
  button :global(svg) {
    flex-shrink: 0;
    color: #596579;
    transition: transform 190ms ease;
  }
  button :global(.rotated) {
    transform: rotate(180deg);
  }
  .panel {
    overflow: hidden;
  }
  .content {
    padding: 0 0 24px;
    color: #596579;
    line-height: 1.7;
    font-size: 15px;
  }
  @media (prefers-reduced-motion: reduce) {
    button :global(svg) {
      transition: none;
    }
  }
</style>
