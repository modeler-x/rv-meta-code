<script lang="ts">
  export let isButton = false;
</script>

<svelte:element this={isButton ? 'button' : 'div'} class="flex w-full items-center gap-3 border-b border-[color:var(--rvc-border)] px-3.5 py-3 text-left text-[color:var(--rvc-text)] last:border-b-0 hover:bg-[color:var(--rvc-hover)]">
  <slot />
</svelte:element>
