<script lang="ts">
  import { untrack } from 'svelte';
  import SearchBox from '@/shared/components/SearchBox.svelte';
  import { HelpService } from '@/modules/help/services/HelpService';
  import { language, translate as t } from '@/shared/i18n/i18n.svelte';

  // ヘルプは md を索引とページに分けて出す。全文検索を持たせるのは、
  // 診断コードや manifest のキー名から引くことが多く、目次だけでは辿れないため。
  let { initialPage = null }: { initialPage?: string | null } = $props();

  const service = new HelpService();
  const pages = $derived(service.listPages($language));
  let query = $state('');
  // 初期表示だけ受け取る。以降はこの画面の操作で変わる。
  let currentId = $state<string | null>(untrack(() => initialPage));

  const current = $derived(pages.find((page) => page.id === currentId) ?? pages[0]);
  const hits = $derived(service.search(pages, query));

  /** 本文中の [text](xx.md) はページ移動にする。外部リンクはそのまま。 */
  function onBodyClick(event: MouseEvent): void {
    const target = (event.target as HTMLElement | null)?.closest('[data-help-link]');
    if (!target) return;
    event.preventDefault();
    currentId = target.getAttribute('data-help-link');
  }
</script>

<SearchBox bind:value={query} placeholder={$t('help_search_placeholder')} />

<div class="flex min-h-0 gap-5">
  <nav class="w-56 shrink-0">
    <p class="px-1 pb-2 text-[11px] font-bold uppercase tracking-wide text-[color:var(--rvc-muted)]">{$t('help_index')}</p>
    <ul class="flex flex-col gap-0.5">
      {#each pages as page}
        <li>
          <button
            data-testid="help-index"
            data-page={page.id}
            data-current={page.id === current?.id}
            class={`w-full truncate rounded-md px-2 py-1.5 text-left text-xs ${page.id === current?.id ? 'bg-[color:var(--rvc-accent)] text-white' : 'hover:bg-[color:var(--rvc-hover)]'}`}
            onclick={() => { currentId = page.id; query = ''; }}
          >{page.title}</button>
        </li>
      {/each}
    </ul>
  </nav>

  <div class="min-w-0 flex-1">
    {#if query.trim().length > 0}
      <p class="mb-2 text-xs text-[color:var(--rvc-muted)]">{$t('help_hits').replace('{n}', String(hits.length))}</p>
      <div class="flex flex-col gap-2">
        {#each hits as hit}
          <button
            data-testid="help-hit"
            data-page={hit.page.id}
            data-count={hit.count}
            class="rounded-lg border border-[color:var(--rvc-border)] p-3 text-left hover:bg-[color:var(--rvc-hover)]"
            onclick={() => { currentId = hit.page.id; query = ''; }}
          >
            <span class="block text-sm font-semibold">{hit.page.title}</span>
            {#each hit.snippets as snippet}
              <span class="mt-1 block truncate text-xs text-[color:var(--rvc-muted)]">{snippet}</span>
            {/each}
          </button>
        {/each}
        {#if hits.length === 0}
          <p class="px-1 py-6 text-sm text-[color:var(--rvc-muted)]">{$t('search_no_match')}</p>
        {/if}
      </div>
    {:else if current}
      <!-- 本文中のリンクを拾うためのハンドラ。個々の <a> ではなく本文に置くのは、
           md から生成した要素にイベントを付けられないため。キーボードは <a> 自身が受ける。 -->
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions, a11y_no_noninteractive_element_interactions -->
      <article
        data-testid="help-body"
        data-page={current.id}
        class="rvc-help rvc-value"
        onclick={onBodyClick}
      >
        {@html current.html}
      </article>
    {/if}
  </div>
</div>

<style>
  .rvc-help :global(.rvc-help-h1) { font-size: 20px; font-weight: 650; margin: 0 0 12px; }
  .rvc-help :global(.rvc-help-h2) { font-size: 15px; font-weight: 650; margin: 22px 0 8px; }
  .rvc-help :global(.rvc-help-h3) { font-size: 13px; font-weight: 650; margin: 16px 0 6px; }
  .rvc-help :global(.rvc-help-p) { font-size: 13px; line-height: 1.75; margin: 0 0 10px; }
  .rvc-help :global(.rvc-help-ul),
  .rvc-help :global(.rvc-help-ol) { font-size: 13px; line-height: 1.75; margin: 0 0 10px; padding-left: 20px; }
  .rvc-help :global(.rvc-help-ul) { list-style: disc; }
  .rvc-help :global(.rvc-help-ol) { list-style: decimal; }
  .rvc-help :global(.rvc-help-code) {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9em;
    background: var(--rvc-search);
    border-radius: 3px;
    padding: 0 3px;
  }
  .rvc-help :global(.rvc-help-pre) {
    background: var(--rvc-search);
    border: 1px solid var(--rvc-border);
    border-radius: 8px;
    padding: 10px 12px;
    overflow-x: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11.5px;
    line-height: 1.6;
    margin: 0 0 12px;
  }
  /* 表は横に溢れるので、本文ではなく表の中でスクロールさせる。 */
  .rvc-help :global(.rvc-help-tablewrap) {
    overflow-x: auto;
    border: 1px solid var(--rvc-border);
    border-radius: 8px;
    margin: 0 0 12px;
  }
  .rvc-help :global(.rvc-help-table) { width: 100%; border-collapse: collapse; font-size: 12px; }
  .rvc-help :global(.rvc-help-table th) {
    text-align: left;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--rvc-muted);
    padding: 7px 10px;
    border-bottom: 1px solid var(--rvc-border);
    white-space: nowrap;
  }
  .rvc-help :global(.rvc-help-table td) { padding: 7px 10px; border-bottom: 1px solid var(--rvc-border); vertical-align: top; }
  .rvc-help :global(.rvc-help-table tr:last-child td) { border-bottom: 0; }
  .rvc-help :global(a) { color: var(--rvc-accent); font-weight: 600; text-decoration: none; }
  .rvc-help :global(a:hover) { text-decoration: underline; }
</style>
