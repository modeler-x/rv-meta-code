<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import ListRow, { type RowBadge } from '@/shared/components/ListRow.svelte';
  import SearchBox from '@/shared/components/SearchBox.svelte';
  import StageRail from '@/shared/components/StageRail.svelte';
  import SelectionToolbar from '@/shared/components/SelectionToolbar.svelte';
  import { RowSelection } from '@/shared/selection/RowSelection.svelte';
  import type { SchemaViewModel } from '@/modules/schema/viewmodels/SchemaViewModel.svelte';
  import type { ManifestViewModel } from '@/modules/manifest/viewmodels/ManifestViewModel.svelte';
  import TaskSheet from '@/shared/components/TaskSheet.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  let {
    viewModel,
    manifestViewModel,
    onOpenOperations,
    onDrafted
  }: {
    viewModel: SchemaViewModel;
    manifestViewModel: ManifestViewModel;
    /** 行のクリックはここへ。マニフェストは 1 スキーマ 1 行の状態表示なので経由しない。 */
    onOpenOperations?: (schemaName: string) => void;
    /** 作り終えたら次の工程（マニフェスト）へ渡すために呼ぶ。 */
    onDrafted?: () => void;
  } = $props();

  // ここで出すのは「マニフェストがあるか」だけ。宣言が何件埋まっているかは
  // マニフェストの責務なので、スキーマの一覧には持ち込まない。
  const withManifest = $derived(
    new Set(manifestViewModel.state.overviews.filter((row) => row.hasManifest).map((row) => row.schemaName))
  );

  function hasManifest(name: string): boolean {
    return withManifest.has(name);
  }

  /**
   * 行のバッジ。generationMode を出すのは、これによって出力される内容が変わるため。
   * entity_and_function はテーブル CRUD も生成し、function_only は宣言した関数だけを出す。
   */
  function badgesOf(name: string): RowBadge[] {
    const overview = manifestViewModel.state.overviews.find((row) => row.schemaName === name);
    const badges: RowBadge[] = [
      {
        testid: 'manifest-state',
        label: overview?.hasManifest ? $t('mf_present') : $t('mf_not_created'),
        tone: overview?.hasManifest ? 'success' : 'muted',
        data: { 'data-state': overview?.hasManifest ? 'present' : 'absent' }
      }
    ];
    if (overview?.generationMode) {
      badges.push({
        testid: 'generation-mode',
        label: overview.generationMode,
        tone: overview.generationMode === 'function_only' ? 'muted' : 'warning',
        data: { 'data-mode': overview.generationMode }
      });
    }
    return badges;
  }

  let query = $state('');
  // スキーマはスキーマ名で選択管理する。
  const selection = new RowSelection<string>();
  const filtered = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return viewModel.state.schemas;
    return viewModel.state.schemas.filter((schema) =>
      `${schema.name} ${schema.comment ?? ''}`.toLowerCase().includes(needle)
    );
  });
  const filteredNames = $derived(filtered.map((schema) => schema.name));

  /**
   * 選んだスキーマのマニフェストを作る。
   *
   * 生成（compile）はここに置かない。生成できるかどうかは manifest があるかで決まるので、
   * その判断材料を持たない画面に操作を置くと、押してからエラーで気づくことになる。
   */
  function draftSelected(): void {
    manifestViewModel.askDraft(selection.selectedWithin(filteredNames));
  }

  function draftOne(schemaName: string): void {
    manifestViewModel.askDraft([schemaName]);
  }
</script>

<StageRail current="schema" />

<SearchBox bind:value={query} placeholder={$t('search_placeholder')} />

<SelectionToolbar
  allSelected={selection.isAllSelected(filteredNames)}
  partiallySelected={selection.isPartiallySelected(filteredNames)}
  selectedCount={selection.selectedWithin(filteredNames).length}
  onToggleAll={(on) => selection.setAll(filteredNames, on)}
>
  <button
    data-testid="draft-manifest"
    class="rounded-md bg-[color:var(--rvc-accent)] px-3 py-1.5 text-xs font-semibold text-white"
    onclick={draftSelected}
  >{$t('mf_draft')}</button>
</SelectionToolbar>

<SectionList title={`${$t('sec_schemas')} / ${filtered.length}`} detail={$t('schemas_hint')}>
  {#each filtered as schema}
    <ListRow
      testid="schema-row"
      data={{ 'data-schema': schema.name }}
      icon={{ label: 'S', color: '#0090a8' }}
      title={schema.name}
      subtitle={`${schema.comment ?? ''}${schema.comment ? ' · ' : ''}${schema.tableCount} ${$t('unit_tables')} / ${schema.viewCount} ${$t('unit_views')}`}
      {query}
      badges={badgesOf(schema.name)}
      selected={selection.isSelected(schema.name)}
      onToggle={() => selection.toggle(schema.name)}
      onOpen={() => (hasManifest(schema.name) ? onOpenOperations?.(schema.name) : draftOne(schema.name))}
      action={hasManifest(schema.name)
        ? { testid: 'open-operations', label: $t('open'), onClick: () => onOpenOperations?.(schema.name) }
        : { testid: 'draft-one', label: $t('mf_create'), onClick: () => draftOne(schema.name) }}
    />
  {/each}
  {#if filtered.length === 0}
    <div class="px-4 py-6 text-sm text-[color:var(--rvc-muted)]">{$t('search_no_match')}</div>
  {/if}
</SectionList>

<TaskSheet
  phase={manifestViewModel.state.draftTask.state}
  title={$t('mf_draft')}
  plan={manifestViewModel.state.draftTask.plan}
  result={manifestViewModel.state.draftTask.result}
  emptyNotice={$t('mf_draft_nothing')}
  progress={manifestViewModel.state.draftTask.progress}
  targets={manifestViewModel.state.draftTask.schemas}
  done={manifestViewModel.state.draftTask.done}
  startedAt={manifestViewModel.state.draftTask.startedAt}
  errorMessage={manifestViewModel.state.errorMessage ?? ''}
  onCancel={() => (manifestViewModel.state.draftTask.state === 'running' ? manifestViewModel.cancelDraftTask() : manifestViewModel.closeDraftTask())}
  onRun={() => manifestViewModel.runDraft()}
  onClose={() => { manifestViewModel.closeDraftTask(); selection.clear(); }}
  next={{ label: $t('mf_next_manifest'), onNext: () => { manifestViewModel.closeDraftTask(); selection.clear(); onDrafted?.(); } }}
/>
