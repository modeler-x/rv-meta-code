<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import ListRow, { type RowBadge } from '@/shared/components/ListRow.svelte';
  import SearchBox from '@/shared/components/SearchBox.svelte';
  import StageRail from '@/shared/components/StageRail.svelte';
  import SelectionToolbar from '@/shared/components/SelectionToolbar.svelte';
  import BusyOverlay from '@/shared/components/BusyOverlay.svelte';
  import ManifestDrawer from '@/shared/components/ManifestDrawer.svelte';
  import TaskSheet from '@/shared/components/TaskSheet.svelte';
  import { RowSelection } from '@/shared/selection/RowSelection.svelte';
  import type { ManifestViewModel } from '@/modules/manifest/viewmodels/ManifestViewModel.svelte';
  import type { GenerationViewModel } from '@/modules/generation/viewmodels/GenerationViewModel.svelte';
  import type { ManifestDiagnostic, ManifestOverview } from '@/modules/manifest/types/Manifest';
  import DiagnosticList from '@/shared/components/DiagnosticList.svelte';
  import Drawer from '@/shared/components/Drawer.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  // マニフェストはスキーマ単位なので、スキーマと同じ一覧の形にする。
  // 中身（operation ごとの宣言）はオペレーションのページが持つ。
  let {
    viewModel,
    generationViewModel,
    onOpenOperations,
    onOpenHelp
  }: {
    viewModel: ManifestViewModel;
    generationViewModel: GenerationViewModel;
    onOpenOperations: (schemaName: string, functionKey?: string) => void;
    onOpenHelp?: (page: string) => void;
  } = $props();

  let query = $state('');
  let openedSchema = $state<string | null>(null);
  const selection = new RowSelection<string>();

  // 一覧に並ぶのは成果物（マニフェスト）がある行だけ。まだ無いものはスキーマのページで作る。
  const withManifest = $derived(viewModel.state.overviews.filter((row) => row.hasManifest));
  const filtered = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return withManifest;
    return withManifest.filter((row) =>
      `${row.schemaName} ${row.comment ?? ''}`.toLowerCase().includes(needle)
    );
  });
  const filteredNames = $derived(filtered.map((row) => row.schemaName));

  /**
   * 選んだスキーマの OpenAPI を生成する。
   *
   * 生成できるのは manifest がある行だけ。compile は manifest_missing で止まるので、
   * 押してからエラーで気づくのではなく、押せない形にする。
   */
  const selectedRows = $derived(filtered.filter((row) => selection.isSelected(row.schemaName)));
  const canGenerate = $derived(selectedRows.length > 0 && selectedRows.every((row) => row.hasManifest));

  function generateSelected(): void {
    generationViewModel.askGeneration(
      selectedRows.map((row) => ({ name: row.schemaName, comment: row.comment, tableCount: 0, viewCount: 0 }))
    );
  }


  /** 選択したスキーマの骨子をまとめて起こす。初版かどうかは区別しない。 */
  async function draftSelected(): Promise<void> {
    await viewModel.draftMany(selection.selectedWithin(filteredNames));
    await reload();
  }

  async function reload(): Promise<void> {
    await viewModel.loadOverviews(
      viewModel.state.overviews.map((row) => ({ name: row.schemaName, comment: row.comment }))
    );
  }

  /** 行のバッジ。状態・profile・診断件数を同じ並びで出す。 */
  function badgesOf(row: ManifestOverview): RowBadge[] {
    const badges: RowBadge[] = [
      {
        testid: 'manifest-state',
        label: row.hasManifest ? $t('mf_present') : $t('mf_not_created'),
        tone: row.hasManifest ? 'success' : 'muted',
        data: { 'data-state': row.hasManifest ? 'present' : 'absent' }
      },
      ...row.profiles.map((profile) => ({
        testid: 'manifest-profile',
        label: profile,
        tone: 'accent' as const,
        data: { 'data-profile': profile }
      }))
    ];
    // generationMode は出力される内容を変えるので行に出す。
    if (row.generationMode) {
      badges.push({
        testid: 'generation-mode',
        label: row.generationMode,
        tone: row.generationMode === 'function_only' ? 'muted' : 'warning',
        data: { 'data-mode': row.generationMode }
      });
    }
    if (row.undeclaredCount > 0) {
      badges.push({
        testid: 'undeclared-count',
        label: `${$t('cat_undeclared')} ${row.undeclaredCount}`,
        tone: 'muted',
        data: { 'data-count': String(row.undeclaredCount) }
      });
    }
    return badges;
  }

  /**
   * 診断は複数スキーマをまとめて見て、直す場所へ飛ぶためのもの。
   * 行ごとに開くより、選択して一括で見るほうが用途に合う。
   * 大きなスキーマでは 25 秒かかるので、一覧では走らせず、ここで初めて実行する。
   */
  let diagnostics = $state<(ManifestDiagnostic & { schemaName?: string })[]>([]);
  let diagnosticsOpen = $state(false);
  let diagnosticsLoading = $state(false);

  async function openDiagnostics(): Promise<void> {
    const targets = selection.selectedWithin(filteredNames);
    if (targets.length === 0) return;
    diagnosticsOpen = true;
    diagnosticsLoading = true;
    diagnostics = await viewModel.loadDiagnosticsFor(targets);
    diagnosticsLoading = false;
  }

  async function openDrawer(schemaName: string): Promise<void> {
    await viewModel.load(schemaName);
    openedSchema = schemaName;
  }
</script>

<StageRail current="manifest" />

{#if viewModel.state.isLoading || viewModel.state.isSaving}
  <BusyOverlay />
{/if}

<SearchBox bind:value={query} placeholder={$t('search_placeholder')} />

<SelectionToolbar
  allSelected={selection.isAllSelected(filteredNames)}
  partiallySelected={selection.isPartiallySelected(filteredNames)}
  selectedCount={selection.selectedWithin(filteredNames).length}
  onToggleAll={(on) => selection.setAll(filteredNames, on)}
>
  <button
    data-testid="show-diagnostics"
    class="rounded-md border border-[color:var(--rvc-border)] px-3 py-1.5 text-xs"
    onclick={openDiagnostics}
  >{$t('mf_show_diagnostics')}</button>
  <button
    data-testid="redraft-selected"
    class="rounded-md border border-[color:var(--rvc-border)] px-3 py-1.5 text-xs"
    onclick={() => viewModel.askDraft(selection.selectedWithin(filteredNames))}
  >{$t('mf_redraft')}</button>
  {#if !canGenerate}
    <span data-testid="generate-blocked" class="text-[11px]" style="color:var(--rvc-warning)">{$t('mf_need_manifest')}</span>
  {/if}
  <button
    data-testid="generate-openapi"
    class="rounded-md bg-[color:var(--rvc-accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
    disabled={!canGenerate}
    onclick={generateSelected}
  >{$t('mf_generate_openapi')}</button>
</SelectionToolbar>

{#if viewModel.state.errorMessage}
  <div
    data-testid="save-error"
    class="mb-3 rounded-lg border px-3.5 py-2.5 text-xs"
    style="border-color:var(--rvc-danger);color:var(--rvc-danger)"
  >
    <span class="rvc-value">{viewModel.state.errorMessage}</span>
    <span class="block text-[color:var(--rvc-muted)]">{$t('mf_save_rejected')}</span>
  </div>
{/if}

<SectionList title={`${$t('nav_manifest')} / ${filtered.length}`} detail={$t('mf_list_hint')}>
  {#each filtered as row}
    <ListRow
      testid="manifest-row"
      data={{ 'data-schema': row.schemaName }}
      icon={{ label: 'M', color: '#0090a8' }}
      title={row.schemaName}
      subtitle={row.hasManifest
        ? `${row.operationCount} ${$t('mf_unit_operations')} · ${row.publicRouteCount} ${$t('mf_unit_routes')}`
        : $t('mf_empty')}
      {query}
      badges={badgesOf(row)}
      selected={selection.isSelected(row.schemaName)}
      onToggle={() => selection.toggle(row.schemaName)}
      onOpen={() => onOpenOperations(row.schemaName)}
      actions={[
        { testid: 'open-operations', label: $t('open'), onClick: () => onOpenOperations(row.schemaName) },
        { testid: 'open-settings', label: $t('mf_settings'), onClick: () => openDrawer(row.schemaName) }
      ]}
    />
  {/each}
  {#if filtered.length === 0}
    <div class="px-4 py-6 text-sm text-[color:var(--rvc-muted)]">{$t('search_no_match')}</div>
  {/if}
</SectionList>

{#if diagnosticsOpen}
  <Drawer
    title={$t('mf_show_diagnostics')}
    testid="diagnostics-drawer"
    dataAttributes={{ 'data-count': String(diagnostics.length) }}
    onClose={() => (diagnosticsOpen = false)}
  >
    {#if diagnosticsLoading}
      <p class="text-xs text-[color:var(--rvc-muted)]">{$t('mf_diagnostics_running')}</p>
    {:else}
      <DiagnosticList
        diagnostics={diagnostics}
        onOpen={(functionKey) => {
          const target = diagnostics.find((d) => d.location.includes(functionKey));
          diagnosticsOpen = false;
          onOpenOperations(target?.schemaName ?? '', functionKey);
        }}
      />
      <p class="mt-3 text-[11px] text-[color:var(--rvc-muted)]">{$t('mf_diagnostics_hint')}</p>
    {/if}
  </Drawer>
{/if}

{#if openedSchema}
  <ManifestDrawer
    {viewModel}
    schemaName={openedSchema}
    onClose={() => { openedSchema = null; void reload(); }}
    onOpenOperation={(functionKey) => { onOpenOperations(openedSchema ?? '', functionKey); openedSchema = null; }}
    {onOpenHelp}
  />
{/if}

<TaskSheet
  phase={viewModel.state.draftTask.state}
  title={$t('mf_draft')}
  plan={viewModel.state.draftTask.plan}
  result={viewModel.state.draftTask.result}
  emptyNotice={$t('mf_draft_nothing')}
  progress={viewModel.state.draftTask.progress}
  targets={viewModel.state.draftTask.schemas}
  done={viewModel.state.draftTask.done}
  startedAt={viewModel.state.draftTask.startedAt}
  errorMessage={viewModel.state.errorMessage ?? ''}
  onCancel={() => (viewModel.state.draftTask.state === 'running' ? viewModel.cancelDraftTask() : viewModel.closeDraftTask())}
  onRun={() => viewModel.runDraft()}
  onClose={() => { viewModel.closeDraftTask(); void reload(); }}
/>
