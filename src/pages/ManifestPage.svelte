<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import ListRow, { type RowBadge } from '@/shared/components/ListRow.svelte';
  import SearchBox from '@/shared/components/SearchBox.svelte';
  import SelectionToolbar from '@/shared/components/SelectionToolbar.svelte';
  import BusyOverlay from '@/shared/components/BusyOverlay.svelte';
  import ManifestDrawer from '@/shared/components/ManifestDrawer.svelte';
  import TaskSheet from '@/shared/components/TaskSheet.svelte';
  import { RowSelection } from '@/shared/selection/RowSelection.svelte';
  import type { ManifestViewModel } from '@/modules/manifest/viewmodels/ManifestViewModel.svelte';
  import type { GenerationViewModel } from '@/modules/generation/viewmodels/GenerationViewModel.svelte';
  import type { ManifestOverview } from '@/modules/manifest/types/Manifest';
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

  const filtered = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return viewModel.state.overviews;
    return viewModel.state.overviews.filter((row) =>
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
    for (const [severity, count] of [
      ['error', row.errorCount],
      ['warning', row.warningCount]
    ] as const) {
      if (count === 0) continue;
      badges.push({
        testid: 'manifest-diagnostic-count',
        label: `${severity} ${count}`,
        tone: severity === 'error' ? 'danger' : 'warning',
        data: { 'data-severity': severity, 'data-count': String(count) }
      });
    }
    return badges;
  }

  async function openDrawer(schemaName: string): Promise<void> {
    await viewModel.load(schemaName);
    openedSchema = schemaName;
  }
</script>

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
        { testid: 'redraft-manifest', label: $t('mf_redraft'), onClick: () => viewModel.askDraft([row.schemaName]) },
        { testid: 'open-diagnostics', label: $t('mf_diagnostics_open'), onClick: () => openDrawer(row.schemaName) }
      ]}
    />
  {/each}
  {#if filtered.length === 0}
    <div class="px-4 py-6 text-sm text-[color:var(--rvc-muted)]">{$t('search_no_match')}</div>
  {/if}
</SectionList>

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
  state={viewModel.state.draftTask.state}
  title={$t('mf_draft')}
  plan={viewModel.state.draftTask.plan}
  result={viewModel.state.draftTask.result}
  emptyNotice={$t('mf_draft_nothing')}
  progress={viewModel.state.draftTask.progress}
  errorMessage={viewModel.state.errorMessage ?? ''}
  onCancel={() => viewModel.closeDraftTask()}
  onRun={() => viewModel.runDraft()}
  onClose={() => { viewModel.closeDraftTask(); void reload(); }}
/>
