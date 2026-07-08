<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import SearchBox from '@/shared/components/SearchBox.svelte';
  import HighlightText from '@/shared/components/HighlightText.svelte';
  import SelectionToolbar from '@/shared/components/SelectionToolbar.svelte';
  import { RowSelection } from '@/shared/selection/RowSelection.svelte';
  import type { SchemaViewModel } from '@/modules/schema/viewmodels/SchemaViewModel.svelte';
  import type { GenerationViewModel } from '@/modules/generation/viewmodels/GenerationViewModel.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  let { viewModel, generationViewModel }: { viewModel: SchemaViewModel; generationViewModel: GenerationViewModel } = $props();

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
    <SectionListRow>
      <input
        type="checkbox"
        class="checkbox checkbox-sm"
        checked={selection.isSelected(schema.name)}
        aria-label={schema.name}
        onchange={() => selection.toggle(schema.name)}
      />
      <button class="flex min-w-0 flex-1 items-center gap-3 text-left" onclick={() => selection.toggle(schema.name)}>
        <IconTile label="S" color="#0090a8" />
        <span class="min-w-0 flex-1"><span class="block font-mono font-semibold"><HighlightText text={schema.name} {query} /></span><span class="block text-xs text-[color:var(--rvc-muted)]"><HighlightText text={schema.comment ?? ''} {query} /></span></span>
        <span class="text-xs text-[color:var(--rvc-muted)]">{schema.tableCount} {$t('unit_tables')} / {schema.viewCount} {$t('unit_views')}</span>
      </button>
    </SectionListRow>
  {/each}
  {#if filtered.length === 0}
    <div class="px-4 py-6 text-sm text-[color:var(--rvc-muted)]">{$t('search_no_match')}</div>
  {/if}
</SectionList>
