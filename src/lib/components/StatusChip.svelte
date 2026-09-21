<script lang="ts">
  import type { PaymentStatus } from '$lib/types';

  let {
    status,
    closed = false,
    label
  }: { status: PaymentStatus; closed?: boolean; label?: string } = $props();

  const statusClass: Record<PaymentStatus, string> = {
    Open: 'status-neutral',
    'Partially paid': 'status-warning',
    Paid: 'status-success',
    Overpaid: 'status-info'
  };
</script>

<span class={`status-chip ${statusClass[status]}`}>
  {label ?? status}
</span>
{#if closed}
  <span class="status-closed">Link closed</span>
{/if}

<style>
  .status-closed {
    display: inline-flex;
    align-items: center;
    min-height: 20px;
    margin-left: 6px;
    border-radius: 999px;
    background: #f1f3f6;
    padding: 4px 8px;
    color: #68768b;
    font-size: 10px;
    font-weight: 650;
    line-height: 1;
    white-space: nowrap;
  }
</style>
