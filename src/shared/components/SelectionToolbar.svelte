<script lang="ts">
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  // Gmail 風の一覧操作バー。表示行の全選択/全解除チェックボックスと、
  // 選択時に現れる操作ボタン（slot）を持つ。
  export let allSelected = false;
  export let partiallySelected = false;
  export let selectedCount = 0;
  export let onToggleAll: (on: boolean) => void;

  let checkboxEl: HTMLInputElement;
  // indeterminate は属性では表現できないため DOM に直接反映する。
  $: if (checkboxEl) checkboxEl.indeterminate = partiallySelected && !allSelected;
</script>

<div class="mb-2 flex items-center gap-3 px-1">
  <input
    bind:this={checkboxEl}
    type="checkbox"
    class="checkbox checkbox-sm"
    checked={allSelected}
    aria-label={$t('select_all')}
    on:change={(event) => onToggleAll(event.currentTarget.checked)}
  />
  {#if selectedCount > 0}
    <span class="text-xs font-semibold text-[color:var(--rvc-text)]">{$t('n_selected').replace('{n}', String(selectedCount))}</span>
    <div class="ml-auto flex items-center gap-2">
      <slot />
    </div>
  {:else}
    <span class="text-xs text-[color:var(--rvc-muted)]">{$t('select_hint')}</span>
  {/if}
</div>
