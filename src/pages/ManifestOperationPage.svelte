<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import ListRow, { type RowBadge } from '@/shared/components/ListRow.svelte';
  import SearchBox from '@/shared/components/SearchBox.svelte';
  import SelectionToolbar from '@/shared/components/SelectionToolbar.svelte';
  import SegmentedControl from '@/shared/components/SegmentedControl.svelte';
  import BusyOverlay from '@/shared/components/BusyOverlay.svelte';
  import ManifestOperationDrawer from '@/shared/components/ManifestOperationDrawer.svelte';
  import { untrack } from 'svelte';
  import { RowSelection } from '@/shared/selection/RowSelection.svelte';
  import type { ManifestViewModel } from '@/modules/manifest/viewmodels/ManifestViewModel.svelte';
  import { diagnosticsOf } from '@/modules/manifest/services/ManifestService';
  import { shortKey } from '@/modules/manifest/services/EffectiveField';
  import BulkFieldDialog from '@/shared/components/BulkFieldDialog.svelte';
  import { PROFILE_NAMES, type ProfileName } from '@/modules/manifest/types/Manifest';
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  /**
   * オペレーション。宣言の中身を関数単位で編集する。
   *
   * profile で分けているのは、編集する内容と頻度が違うため。
   *   postgrest … 全関数が対象。触るのは operationId / tags / security / description。
   *   bff       … 公開すると決めたものだけ。ルートと bind を編集する。
   */
  let {
    viewModel,
    schemas,
    initialSchema = null,
    initialFunctionKey = null,
    initialProfile = 'postgrest',
    onOpenHelp
  }: {
    viewModel: ManifestViewModel;
    schemas: { name: string; comment: string | null }[];
    initialSchema?: string | null;
    initialFunctionKey?: string | null;
    initialProfile?: ProfileName;
    onOpenHelp?: (page: string) => void;
  } = $props();

  // 前の工程から渡されたスキーマを検索語として置く。固定ではないので外せば全件に戻る。
  let query = $state(untrack(() => initialSchema ?? ''));
  // 初期値としてだけ受け取る。以降はこの画面の操作で変わるので、props へは追従させない。
  let profile = $state<ProfileName>(untrack(() => initialProfile));
  let openedKey = $state<string | null>(untrack(() => initialFunctionKey));
  let bulkOpen = $state(false);
  const selection = new RowSelection<string>();

  /**
   * 行は全スキーマの公開関数。宣言があるものだけに絞らないのは、
   * 「公開し忘れ」を一覧の中で見つけられるようにするため。
   * スキーマの絞り込みは検索窓で行う（ドロップダウンで 1 つに固定しない）。
   */
  const rows = $derived.by(() => {
    const scoped =
      profile === 'bff' ? viewModel.state.catalog.filter((row) => row.declared) : viewModel.state.catalog;
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return scoped;
    return scoped.filter((row) =>
      `${row.schemaName} ${row.functionKey} ${row.operationId ?? ''} ${row.description}`
        .toLowerCase()
        .includes(needle)
    );
  });

  const rowKeys = $derived(rows.map((row) => row.functionKey));

  /** 編集は 1 スキーマずつ。行を開くときに、そのスキーマへ切り替える。 */
  async function openRow(row: { schemaName: string; functionKey: string }): Promise<void> {
    if (viewModel.state.schemaName !== row.schemaName) await viewModel.load(row.schemaName);
    openedKey = row.functionKey;
  }

  const profileOptions = $derived(
    PROFILE_NAMES.map((name) => ({ label: name, value: name }))
  );

  function selected(): string[] {
    return selection.selectedWithin(rowKeys);
  }

  function declareSelected(): void {
    for (const key of selected()) viewModel.declareOperation(key);
  }

  function undeclareSelected(): void {
    for (const key of selected()) viewModel.undeclareOperation(key);
  }

  function publishSelected(): void {
    for (const key of selected()) {
      viewModel.declareOperation(key);
      if (viewModel.routesOf(key).length === 0) viewModel.publish(key);
    }
  }

  function unpublishSelected(): void {
    for (const key of selected()) viewModel.unpublish(key);
  }

  type Row = (typeof rows)[number];

  /** 行のバッジ。profile によって見せる軸が変わる（公開/非公開 か 宣言済み/未宣言 か）。 */
  function badgesOf(row: Row): RowBadge[] {
    const badges: RowBadge[] =
      profile === 'bff'
        ? [
            {
              testid: 'public-state',
              label: row.routeCount > 0 ? `${$t('mf_public')} ${row.routeCount}` : $t('mf_not_public'),
              tone: row.routeCount > 0 ? 'success' : 'muted',
              data: { 'data-public': String(row.routeCount > 0) }
            }
          ]
        : [
            {
              testid: 'declared-state',
              label: $t(row.state === 'declared' ? 'cat_declared' : row.state === 'orphaned' ? 'cat_orphaned' : 'cat_undeclared'),
              tone: row.state === 'declared' ? 'success' : row.state === 'orphaned' ? 'danger' : 'muted',
              data: { 'data-state': row.state }
            }
          ];
    // 診断は開いているスキーマの分だけ持つ。他スキーマの行では出さない。
    const errors =
      viewModel.state.schemaName === row.schemaName
        ? diagnosticsOf(viewModel.state.diagnostics, row.functionKey).filter((d) => d.severity === 'error').length
        : 0;
    if (errors > 0) {
      badges.push({
        testid: 'operation-error-count',
        label: `error ${errors}`,
        tone: 'danger',
        data: { 'data-count': String(errors) }
      });
    }
    return badges;
  }

  async function switchSchema(name: string): Promise<void> {
    selection.clear();
    openedKey = null;
    await viewModel.load(name);
  }
</script>

{#if viewModel.state.isLoading || viewModel.state.isSaving}
  <BusyOverlay />
{/if}

<div class="mb-3 flex flex-wrap items-center gap-3">
  <div class="w-56">
    <SegmentedControl
      options={profileOptions}
      value={profile}
      onSelect={(value) => { profile = value as ProfileName; selection.clear(); }}
    />
  </div>
  <span data-testid="profile-hint" data-profile={profile} class="min-w-0 flex-1 text-[11px] text-[color:var(--rvc-muted)]">
    {$t(profile === 'bff' ? 'mf_profile_bff_hint' : 'mf_profile_postgrest_hint')}
  </span>
  <button
    data-testid="save-manifest"
    class="rounded-md border border-[color:var(--rvc-border)] px-3 py-1.5 text-xs disabled:opacity-40"
    disabled={!viewModel.isDirty || viewModel.state.isSaving}
    onclick={() => viewModel.save()}
  >{$t('mf_save')}</button>
</div>

<SearchBox bind:value={query} placeholder={$t('search_placeholder')} />

<SelectionToolbar
  allSelected={selection.isAllSelected(rowKeys)}
  partiallySelected={selection.isPartiallySelected(rowKeys)}
  selectedCount={selected().length}
  onToggleAll={(on) => selection.setAll(rowKeys, on)}
>
  <button
    data-testid="bulk-set-field"
    class="rounded-md border border-[color:var(--rvc-border)] px-3 py-1.5 text-xs"
    onclick={() => (bulkOpen = true)}
  >{$t('mf_bulk_set')}</button>
  {#if profile === 'bff'}
    <button
      data-testid="bulk-publish"
      class="rounded-md bg-[color:var(--rvc-accent)] px-3 py-1.5 text-xs font-semibold text-white"
      onclick={publishSelected}
    >{$t('mf_publish')}</button>
    <button
      data-testid="bulk-unpublish"
      class="rounded-md border border-[color:var(--rvc-border)] px-3 py-1.5 text-xs"
      onclick={unpublishSelected}
    >{$t('mf_unpublish')}</button>
  {:else}
    <button
      data-testid="bulk-declare"
      class="rounded-md bg-[color:var(--rvc-accent)] px-3 py-1.5 text-xs font-semibold text-white"
      onclick={declareSelected}
    >{$t('mf_declare')}</button>
    <button
      data-testid="bulk-undeclare"
      class="rounded-md border border-[color:var(--rvc-border)] px-3 py-1.5 text-xs"
      onclick={undeclareSelected}
    >{$t('mf_undeclare')}</button>
  {/if}
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

<SectionList title={`${$t('nav_operations')} / ${rows.length}`} detail={$t('mf_operations_hint')}>
  {#each rows as row}
    <ListRow
      testid="operation-row"
      data={{
        'data-operation': row.functionKey,
        'data-schema': row.schemaName,
        'data-declared': String(row.declared),
        'data-routes': String(row.routeCount)
      }}
      icon={{ label: 'O', color: '#0090a8' }}
      title={shortKey(row.functionKey)}
      subtitle={`${row.schemaName} · ${row.operationId ? `operationId: ${row.operationId} · ` : ''}${row.description}`}
      {query}
      badges={badgesOf(row)}
      selected={selection.isSelected(row.functionKey)}
      onToggle={() => selection.toggle(row.functionKey)}
      onOpen={() => openRow(row)}
      action={{
        testid: 'edit-operation',
        label: $t('edit'),
        onClick: () => openRow(row),
        data: { 'data-operation': row.functionKey }
      }}
    />
  {/each}
  {#if rows.length === 0}
    <div class="px-4 py-6 text-sm text-[color:var(--rvc-muted)]">{$t('mf_no_operations')}</div>
  {/if}
</SectionList>

{#if bulkOpen}
  <BulkFieldDialog
    {viewModel}
    {profile}
    functionKeys={selected()}
    onClose={() => (bulkOpen = false)}
  />
{/if}

{#if openedKey}
  <ManifestOperationDrawer
    {viewModel}
    functionKey={openedKey}
    {profile}
    onClose={() => (openedKey = null)}
    {onOpenHelp}
  />
{/if}
