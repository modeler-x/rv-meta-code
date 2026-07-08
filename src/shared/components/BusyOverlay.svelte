<script lang="ts">
  // 処理中に画面を覆い、入力操作を不可にするスピナーオーバーレイ。
  // <main class="relative"> を基準に全面を覆う（GenerationSheet と同じ overlay 方式）。
  export let show = false;
  export let label = '';
</script>

{#if show}
  <div class="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/20 backdrop-blur-[1px]" aria-busy="true" aria-live="polite">
    <div class="h-8 w-8 animate-spin rounded-full border-[3px] border-[color:var(--rvc-search)] border-t-[color:var(--rvc-accent)]"></div>
    {#if label}<p class="text-xs font-semibold text-[color:var(--rvc-text)]">{label}</p>{/if}
  </div>
{/if}
