<script lang="ts">
  export let isButton = false;
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:element this={isButton ? 'button' : 'div'} class="flex w-full items-center gap-3 border-b border-[color:var(--rvc-border)] px-3.5 py-3 text-left text-[color:var(--rvc-text)] last:border-b-0 hover:bg-[color:var(--rvc-hover)]" on:click>
  <slot />
</svelte:element>
