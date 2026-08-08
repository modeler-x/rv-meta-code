<script lang="ts">
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  // 右から出す作業パネル。モーダルではなく Drawer なのは、一覧の文脈を残したまま
  // 1 行の中身を直せるようにするため。閉じ開きを繰り返させない。
  let {
    title,
    testid,
    dataAttributes = {},
    onClose,
    header,
    footer,
    children
  }: {
    title: string;
    testid: string;
    /** 行を特定するための data-* 。テストと自動操作が名前ではなく値で引けるようにする。 */
    dataAttributes?: Record<string, string>;
    onClose: () => void;
    header?: import('svelte').Snippet;
    footer?: import('svelte').Snippet;
    children: import('svelte').Snippet;
  } = $props();

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') onClose();
  }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-40 bg-black/35" onclick={onClose}></div>

<div
  class="fixed inset-y-0 right-0 z-50 flex w-[min(880px,96vw)] flex-col border-l border-[color:var(--rvc-border)] bg-[color:var(--rvc-panel)] shadow-2xl"
  data-testid={testid}
  {...dataAttributes}
  role="dialog"
  aria-modal="true"
  aria-label={title}
>
  <header class="flex flex-wrap items-center gap-2 border-b border-[color:var(--rvc-border)] px-4 py-3">
    <h3 class="min-w-0 flex-1 truncate font-mono text-sm font-semibold rvc-value">{title}</h3>
    {@render header?.()}
    <button data-testid="close-drawer" class="rounded-md border border-[color:var(--rvc-border)] px-3 py-1 text-xs" onclick={onClose}>
      {$t('close')}
    </button>
  </header>

  <div class="flex-1 overflow-y-auto px-4 py-4">
    {@render children()}
  </div>

  {#if footer}
    <footer class="flex flex-wrap items-center gap-2 border-t border-[color:var(--rvc-border)] px-4 py-3">
      {@render footer()}
    </footer>
  {/if}
</div>
