<script lang="ts">
  import { Search, X } from 'lucide-svelte';
  let { value = $bindable(''), placeholder = '' }: { value?: string; placeholder?: string } = $props();
</script>

<div class="mb-3 flex items-center gap-2 rounded-lg border border-[color:var(--rvc-border)] bg-[color:var(--rvc-search)] px-3 py-2">
  <Search size={15} class="shrink-0 text-[color:var(--rvc-muted)]" />
  <input
    class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--rvc-muted)]"
    type="text"
    {placeholder}
    bind:value
  />
  {#if value.length > 0}
    <button type="button" class="shrink-0 text-[color:var(--rvc-muted)] hover:text-[color:var(--rvc-text)]" onclick={() => (value = '')}>
      <X size={15} />
    </button>
  {/if}
</div>
