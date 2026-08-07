<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import StatusBadge from '@/shared/components/StatusBadge.svelte';
  import BusyOverlay from '@/shared/components/BusyOverlay.svelte';
  import ManifestOperationDrawer from '@/shared/components/ManifestOperationDrawer.svelte';
  import type { ManifestViewModel } from '@/modules/manifest/viewmodels/ManifestViewModel.svelte';
  import type { ManifestDiagnostic } from '@/modules/manifest/types/Manifest';
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  let { viewModel, schemaName }: { viewModel: ManifestViewModel; schemaName: string } = $props();

  // Drawer で開いている operation のキー。診断からのジャンプ先も同じ値で指す。
  let openedKey = $state<string | null>(null);
  let jumpLocation = $state<string | null>(null);

  const manifest = $derived(
    (viewModel.state.draft ?? viewModel.state.stored?.manifest ?? null) as Record<string, unknown> | null
  );
  const profiles = $derived(
    (manifest?.profiles ?? {}) as Record<string, Record<string, unknown>>
  );
  const operations = $derived(
    (manifest?.operations ?? {}) as Record<string, Record<string, unknown>>
  );
  const operationKeys = $derived(Object.keys(operations).sort());

  /** その operation に紐づく診断。location が operations."<key>" で始まるものを拾う。 */
  function diagnosticsFor(key: string): ManifestDiagnostic[] {
    const prefix = `operations."${key}"`;
    return viewModel.state.diagnostics.filter((d) => d.location.startsWith(prefix));
  }

  /** 診断の location から operation キーを取り出す。取れなければ null（スキーマ全体の指摘）。 */
  function keyOf(location: string): string | null {
    const matched = /^operations\."([^"]+)"/.exec(location);
    return matched ? matched[1] : null;
  }

  function openFromDiagnostic(diagnostic: ManifestDiagnostic): void {
    const key = keyOf(diagnostic.location);
    if (!key) return;
    openedKey = key;
    jumpLocation = diagnostic.location;
  }

  function routeCount(key: string): number {
    const routes = operations[key]?.publicRoutes;
    return Array.isArray(routes) ? routes.length : 0;
  }
</script>

{#if viewModel.state.isLoading}
  <BusyOverlay />
{/if}

<div class="flex flex-wrap items-center gap-2 px-1 pb-3">
  <span class="font-mono text-sm font-semibold">{schemaName}</span>
  {#if viewModel.blockingCount > 0}
    <StatusBadge label={`error ${viewModel.blockingCount}`} tone="danger" />
  {:else if viewModel.state.stored?.manifest}
    <StatusBadge label={$t('mf_no_violation')} tone="success" />
  {:else}
    <StatusBadge label={$t('mf_not_created')} tone="muted" />
  {/if}
  {#if viewModel.state.draft}
    <StatusBadge label={$t('mf_unsaved_draft')} tone="warning" />
  {/if}

  <div class="ml-auto flex gap-2">
    <button
      class="rounded-md border border-[color:var(--rvc-border)] px-3 py-1.5 text-xs"
      onclick={() => viewModel.load(schemaName)}
    >{$t('mf_reload')}</button>
    <button
      class="rounded-md border border-[color:var(--rvc-border)] px-3 py-1.5 text-xs"
      onclick={() => viewModel.draft()}
    >{$t('mf_draft')}</button>
    <button
      class="rounded-md bg-[color:var(--rvc-accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
      disabled={viewModel.state.isSaving || !manifest}
      onclick={() => viewModel.save()}
    >{$t('mf_save')}</button>
  </div>
</div>

{#if viewModel.state.errorMessage}
  <!-- 投入は検証を通ったときだけ行われる。落ちたら保存されていないことを明示する。 -->
  <div class="mb-3 rounded-lg border border-[color:#e5484d] px-3.5 py-2.5 text-xs" style="color:#e5484d">
    {viewModel.state.errorMessage}
    <span class="block text-[color:var(--rvc-muted)]">{$t('mf_save_rejected')}</span>
  </div>
{/if}

<!-- スキーマ単位の宣言。operation 単位ではないので Drawer ではなくページ本体に置く。 -->
<SectionList title={$t('mf_sec_profiles')} detail={$t('mf_profiles_hint')}>
  {#each Object.entries(profiles) as [name, profile]}
    <SectionListRow>
      <span class="w-24 font-mono text-xs font-semibold">{name}</span>
      <span class="min-w-0 flex-1 truncate text-xs text-[color:var(--rvc-muted)]">
        basePath: {String(profile.basePath ?? '—')} ·
        generationMode: {String(profile.generationMode ?? '—')} ·
        stripPrefix.arg: {String(
          ((profile.naming as Record<string, Record<string, unknown>> | undefined)?.stripPrefix
            ?.arg as string | undefined) ?? ''
        ) || '(なし)'}
      </span>
    </SectionListRow>
  {/each}
  {#if Object.keys(profiles).length === 0}
    <div class="px-4 py-6 text-sm text-[color:var(--rvc-muted)]">{$t('mf_empty')}</div>
  {/if}
</SectionList>

<SectionList title={`${$t('mf_sec_operations')} / ${operationKeys.length}`} detail={$t('mf_operations_hint')}>
  {#each operationKeys as key}
    {@const routes = routeCount(key)}
    {@const errors = diagnosticsFor(key).filter((d) => d.severity === 'error').length}
    <SectionListRow>
      <button
        class="flex min-w-0 flex-1 items-center gap-3 text-left"
        onclick={() => { openedKey = key; jumpLocation = null; }}
      >
        <span class="min-w-0 flex-1">
          <span class="block truncate font-mono text-xs font-semibold">{key}</span>
          <span class="block text-xs text-[color:var(--rvc-muted)]">
            operationId: {String(operations[key]?.operationId ?? '—')}
          </span>
        </span>
        {#if routes > 0}
          <StatusBadge label={`bff ${routes}`} tone="success" />
        {:else}
          <StatusBadge label={$t('mf_not_public')} tone="muted" />
        {/if}
        {#if errors > 0}
          <StatusBadge label={`error ${errors}`} tone="danger" />
        {/if}
      </button>
    </SectionListRow>
  {/each}
  {#if operationKeys.length === 0}
    <div class="px-4 py-6 text-sm text-[color:var(--rvc-muted)]">{$t('mf_no_operations')}</div>
  {/if}
</SectionList>

<!-- 診断は全件出る。location から編集箇所へ一手で飛べるようにする。 -->
<SectionList title={`${$t('mf_sec_diagnostics')} / ${viewModel.state.diagnostics.length}`} detail={$t('mf_diagnostics_hint')}>
  {#each viewModel.state.diagnostics as diagnostic}
    <SectionListRow>
      <span
        class="h-8 w-1 shrink-0 rounded"
        style={`background:${diagnostic.severity === 'error' ? '#e5484d' : diagnostic.severity === 'warning' ? '#ff9500' : 'var(--rvc-muted)'}`}
      ></span>
      <span class="min-w-0 flex-1">
        <span class="block font-mono text-[11px] font-semibold">{diagnostic.code}</span>
        <span class="block truncate font-mono text-[11px] text-[color:var(--rvc-muted)]">{diagnostic.location}</span>
        <span class="block text-xs">{diagnostic.message}</span>
        {#if diagnostic.hint}
          <span class="block text-[11px] text-[color:var(--rvc-muted)]">{diagnostic.hint}</span>
        {/if}
      </span>
      {#if keyOf(diagnostic.location)}
        <button
          class="shrink-0 text-xs font-semibold text-[color:var(--rvc-accent)]"
          onclick={() => openFromDiagnostic(diagnostic)}
        >{$t('mf_jump')}</button>
      {/if}
    </SectionListRow>
  {/each}
  {#if viewModel.state.diagnostics.length === 0}
    <div class="px-4 py-6 text-sm text-[color:var(--rvc-muted)]">{$t('mf_no_diagnostics')}</div>
  {/if}
</SectionList>

{#if openedKey}
  <ManifestOperationDrawer
    operationKey={openedKey}
    operation={operations[openedKey] ?? {}}
    diagnostics={diagnosticsFor(openedKey)}
    {jumpLocation}
    onClose={() => { openedKey = null; jumpLocation = null; }}
  />
{/if}
