<script lang="ts">
  import StatusBadge from '@/shared/components/StatusBadge.svelte';
  import type { ManifestDiagnostic } from '@/modules/manifest/types/Manifest';
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  // operation 単位の宣言を確認・編集する。モーダルではなく Drawer なのは、
  // 診断一覧と該当箇所を並べて見せ、閉じ開きを繰り返させないため。
  let {
    operationKey,
    operation,
    diagnostics,
    jumpLocation,
    onClose
  }: {
    operationKey: string;
    operation: Record<string, unknown>;
    diagnostics: ManifestDiagnostic[];
    jumpLocation: string | null;
    onClose: () => void;
  } = $props();

  let mode = $state<'form' | 'json'>('form');

  const routes = $derived(
    (Array.isArray(operation.publicRoutes) ? operation.publicRoutes : []) as Record<string, unknown>[]
  );
  // publicRoutes の有無がそのまま「BFF に公開するか」。
  const isPublic = $derived(routes.length > 0);

  /** 診断の location から publicRoutes[n] の n を取り出す。ジャンプ先の強調に使う。 */
  const jumpIndex = $derived.by(() => {
    if (!jumpLocation) return null;
    const matched = /publicRoutes\[(\d+)\]/.exec(jumpLocation);
    return matched ? Number(matched[1]) : null;
  });

  function bindEntries(route: Record<string, unknown>): [string, string, string][] {
    const bind = (route.bind ?? {}) as Record<string, Record<string, unknown>>;
    return Object.entries(bind).map(([arg, rule]) => {
      if (typeof rule?.const !== 'undefined') return [arg, 'const', String(rule.const)];
      if (typeof rule?.from === 'string') return [arg, rule.from, String(rule.name ?? '')];
      return [arg, '未 bind', ''];
    });
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') onClose();
  }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-40 bg-black/35" onclick={onClose}></div>

<div
  class="fixed inset-y-0 right-0 z-50 flex w-[min(820px,95vw)] flex-col border-l border-[color:var(--rvc-border)] bg-[color:var(--rvc-panel)] shadow-2xl"
  role="dialog"
  aria-modal="true"
  aria-label={operationKey}
>
  <header class="flex flex-wrap items-center gap-2 border-b border-[color:var(--rvc-border)] px-4 py-3">
    <h3 class="min-w-0 flex-1 truncate font-mono text-sm font-semibold">{operationKey}</h3>
    <div class="inline-flex overflow-hidden rounded-md border border-[color:var(--rvc-border)]">
      <button
        class={`px-3 py-1 text-xs ${mode === 'form' ? 'bg-[color:var(--rvc-accent)] font-semibold text-white' : ''}`}
        aria-pressed={mode === 'form'}
        onclick={() => (mode = 'form')}
      >{$t('mf_tab_form')}</button>
      <button
        class={`px-3 py-1 text-xs ${mode === 'json' ? 'bg-[color:var(--rvc-accent)] font-semibold text-white' : ''}`}
        aria-pressed={mode === 'json'}
        onclick={() => (mode = 'json')}
      >JSON</button>
    </div>
    <button class="rounded-md border border-[color:var(--rvc-border)] px-3 py-1 text-xs" onclick={onClose}>
      {$t('close')}
    </button>
  </header>

  <div class="flex-1 overflow-y-auto px-4 py-4">
    {#if mode === 'json'}
      <pre class="overflow-x-auto rounded-lg border border-[color:var(--rvc-border)] bg-[color:var(--rvc-search)] p-3 font-mono text-[11px] leading-relaxed">{JSON.stringify(operation, null, 2)}</pre>
    {:else}
      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {#each [['operationId', operation.operationId], ['operationGroup', operation.operationGroup], ['tags', operation.tags], ['security', operation.security]] as [label, value]}
            <label class="flex flex-col gap-1">
              <span class="text-[10px] font-bold uppercase tracking-wide text-[color:var(--rvc-muted)]">{label}</span>
              <input
                class="rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-bg)] px-2 py-1 font-mono text-xs"
                value={value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value)}
                placeholder={$t('mf_from_defaults')}
                readonly
              />
            </label>
          {/each}
        </div>

        {#if operation.description}
          <label class="flex flex-col gap-1">
            <span class="text-[10px] font-bold uppercase tracking-wide text-[color:var(--rvc-muted)]">description</span>
            <textarea
              class="rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-bg)] px-2 py-1 text-xs"
              rows="2"
              readonly>{String(operation.description)}</textarea>
          </label>
        {/if}

        <div class="flex flex-wrap items-center gap-3 border-t border-[color:var(--rvc-border)] pt-4">
          <span class="text-sm font-semibold">{$t('mf_publish_bff')}</span>
          <StatusBadge label={isPublic ? `${routes.length}` : $t('mf_not_public')} tone={isPublic ? 'success' : 'muted'} />
          <span class="text-xs text-[color:var(--rvc-muted)]">
            {isPublic ? $t('mf_publish_on_hint') : $t('mf_publish_off_hint')}
          </span>
        </div>

        {#each routes as route, index}
          <div
            class="flex flex-col gap-2 rounded-lg border p-3"
            class:border-[color:var(--rvc-border)]={jumpIndex !== index}
            style={jumpIndex === index ? 'border-color:var(--rvc-accent);outline:2px solid var(--rvc-accent);outline-offset:2px' : ''}
          >
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-xs font-semibold">{String(route.operationId ?? '—')}</span>
              <StatusBadge label={String(route.method ?? '—')} tone="accent" />
              <span class="min-w-0 flex-1 truncate font-mono text-xs text-[color:var(--rvc-muted)]">{String(route.path ?? '')}</span>
            </div>
            {#if route.summary}
              <span class="text-xs text-[color:var(--rvc-muted)]">{String(route.summary)}</span>
            {/if}
            <div class="flex flex-col gap-1">
              <span class="text-[10px] font-bold uppercase tracking-wide text-[color:var(--rvc-muted)]">bind</span>
              {#each bindEntries(route) as [arg, kind, value]}
                <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 font-mono text-[11px]">
                  <span>{arg}</span>
                  <StatusBadge label={kind} tone={kind === '未 bind' ? 'danger' : 'muted'} />
                  <span class="truncate text-[color:var(--rvc-muted)]">{value}</span>
                </div>
              {/each}
              {#if bindEntries(route).length === 0}
                <span class="text-[11px] text-[color:var(--rvc-muted)]">{$t('mf_no_bind')}</span>
              {/if}
            </div>
          </div>
        {/each}

        {#if diagnostics.length > 0}
          <div class="flex flex-col gap-2 border-t border-[color:var(--rvc-border)] pt-4">
            <span class="text-sm font-semibold">{$t('mf_sec_diagnostics')}</span>
            {#each diagnostics as diagnostic}
              <div class="flex gap-2 rounded-lg border border-[color:var(--rvc-border)] p-2.5">
                <span
                  class="w-1 shrink-0 rounded"
                  style={`background:${diagnostic.severity === 'error' ? '#e5484d' : diagnostic.severity === 'warning' ? '#ff9500' : 'var(--rvc-muted)'}`}
                ></span>
                <span class="min-w-0">
                  <span class="block font-mono text-[11px] font-semibold">{diagnostic.code}</span>
                  <span class="block truncate font-mono text-[11px] text-[color:var(--rvc-muted)]">{diagnostic.location}</span>
                  <span class="block text-xs">{diagnostic.message}</span>
                  {#if diagnostic.hint}
                    <span class="block text-[11px] text-[color:var(--rvc-muted)]">{diagnostic.hint}</span>
                  {/if}
                </span>
              </div>
            {/each}
          </div>
        {/if}

        <p class="text-[11px] text-[color:var(--rvc-muted)]">{$t('mf_format_help')}</p>
      </div>
    {/if}
  </div>
</div>
