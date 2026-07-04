<script lang="ts">
  export let options: { label: string; value: string }[] = [];
  export let value: string;
  export let onSelect: (value: string) => void;
</script>

<div class="flex gap-1 rounded-lg bg-[color:var(--rvc-search)] p-1">
  {#each options as option}
    <button class={`flex-1 rounded-md px-3 py-1.5 text-xs ${value === option.value ? 'bg-[color:var(--rvc-accent)] text-white' : ''}`} on:click={() => onSelect(option.value)}>
      {option.label}
    </button>
  {/each}
</div>
