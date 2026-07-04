<script lang="ts">
  export let title: string;
  export let detail = '';
</script>

<section class="mb-6">
  <div class="flex items-baseline justify-between px-1 pb-2 text-[12px] font-semibold uppercase tracking-wide text-[color:var(--rvc-muted)]">
    <span>{title}</span>
    {#if detail}<span class="font-normal normal-case tracking-normal">{detail}</span>{/if}
  </div>
  <div class="overflow-hidden rounded-lg border border-[color:var(--rvc-border)] bg-[color:var(--rvc-panel)] shadow-sm">
    <slot />
  </div>
</section>
