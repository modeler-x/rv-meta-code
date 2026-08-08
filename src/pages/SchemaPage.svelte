<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import ListRow from '@/shared/components/ListRow.svelte';
  import SearchBox from '@/shared/components/SearchBox.svelte';
  import SelectionToolbar from '@/shared/components/SelectionToolbar.svelte';
  import { RowSelection } from '@/shared/selection/RowSelection.svelte';
  import type { SchemaViewModel } from '@/modules/schema/viewmodels/SchemaViewModel.svelte';
  import type { GenerationViewModel } from '@/modules/generation/viewmodels/GenerationViewModel.svelte';
  import type { ManifestViewModel } from '@/modules/manifest/viewmodels/ManifestViewModel.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  let {
    viewModel,
    generationViewModel,
    manifestViewModel,
    onOpenManifest
  }: {
    viewModel: SchemaViewModel;
    generationViewModel: GenerationViewModel;
    manifestViewModel: ManifestViewModel;
    onOpenManifest?: (schemaName: string) => void;
  } = $props();

  // ここで出すのは「マニフェストがあるか」だけ。宣言が何件埋まっているかは
  // マニフェストの責務なので、スキーマの一覧には持ち込まない。
  const withManifest = $derived(
    new Set(manifestViewModel.state.overviews.filter((row) => row.hasManifest).map((row) => row.schemaName))
  );

  function hasManifest(name: string): boolean {
    return withManifest.has(name);
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

  function generateSelected(): void {
    const names = new Set(selection.selectedWithin(filteredNames));
    const schemas = filtered.filter((schema) => names.has(schema.name));
    generationViewModel.askGeneration(schemas);
  }
</script>

<SearchBox bind:value={query} placeholder={$t('search_placeholder')} />

<SelectionToolbar
  allSelected={selection.isAllSelected(filteredNames)}
  partiallySelected={selection.isPartiallySelected(filteredNames)}
  selectedCount={selection.selectedWithin(filteredNames).length}
  onToggleAll={(on) => selection.setAll(filteredNames, on)}
>
  <button
    class="rounded-md bg-[color:var(--rvc-accent)] px-3 py-1.5 text-xs font-semibold text-white"
    onclick={generateSelected}
  >{$t('generate')}</button>
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
      badges={[{
        testid: 'manifest-state',
        label: hasManifest(schema.name) ? $t('mf_present') : $t('mf_not_created'),
        tone: hasManifest(schema.name) ? 'success' : 'muted',
        data: { 'data-state': hasManifest(schema.name) ? 'present' : 'absent' }
      }]}
      selected={selection.isSelected(schema.name)}
      onToggle={() => selection.toggle(schema.name)}
      action={onOpenManifest
        ? { testid: 'open-manifest', label: $t('open'), onClick: () => onOpenManifest?.(schema.name) }
        : undefined}
    />
  {/each}
  {#if filtered.length === 0}
    <div class="px-4 py-6 text-sm text-[color:var(--rvc-muted)]">{$t('search_no_match')}</div>
  {/if}
</SectionList>
