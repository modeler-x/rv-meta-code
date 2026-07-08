<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import SearchBox from '@/shared/components/SearchBox.svelte';
  import HighlightText from '@/shared/components/HighlightText.svelte';
  import StatusBadge from '@/shared/components/StatusBadge.svelte';
  import SelectionToolbar from '@/shared/components/SelectionToolbar.svelte';
  import BusyOverlay from '@/shared/components/BusyOverlay.svelte';
  import { RowSelection } from '@/shared/selection/RowSelection.svelte';
  import type { EntityViewModel } from '@/modules/entity/viewmodels/EntityViewModel.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  let { viewModel, onOpenEntity }: { viewModel: EntityViewModel; onOpenEntity: (entityId: string) => void } = $props();

  let query = $state('');
  const selection = new RowSelection();
  const filtered = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return viewModel.entities;
    return viewModel.entities.filter((entity) =>
      `${entity.tableName} ${entity.description ?? ''} ${entity.tableSchema}`.toLowerCase().includes(needle)
    );
  });
  const filteredIds = $derived(filtered.map((entity) => entity.id));

  async function applyReadOnly(isReadOnly: boolean): Promise<void> {
    const ids = selection.selectedWithin(filteredIds);
    await viewModel.setReadOnlyMany(ids, isReadOnly);
    selection.clear();
  }
</script>

<SearchBox bind:value={query} placeholder={$t('search_placeholder')} />

<SelectionToolbar
  allSelected={selection.isAllSelected(filteredIds)}
  partiallySelected={selection.isPartiallySelected(filteredIds)}
  selectedCount={selection.selectedWithin(filteredIds).length}
  onToggleAll={(on) => selection.setAll(filteredIds, on)}
>
  <button
    class="rounded-md bg-[color:var(--rvc-accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
    disabled={viewModel.isReadOnlyUpdating}
    onclick={() => applyReadOnly(true)}
  >{$t('read_only_on')}</button>
  <button
    class="rounded-md border border-[color:var(--rvc-border)] px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
    disabled={viewModel.isReadOnlyUpdating}
    onclick={() => applyReadOnly(false)}
  >{$t('read_only_off')}</button>
</SelectionToolbar>

<SectionList title={`${$t('sec_entities')} / ${filtered.length}`}>
  {#each filtered as entity}
    <SectionListRow>
      <input
        type="checkbox"
        class="checkbox checkbox-sm"
        checked={selection.isSelected(entity.id)}
        aria-label={entity.tableName}
        onclick={(event) => event.stopPropagation()}
        onchange={() => selection.toggle(entity.id)}
      />
      <button class="flex min-w-0 flex-1 items-center gap-3 text-left" onclick={() => onOpenEntity(String(entity.id))}>
        <IconTile label="T" color="#0087aa" />
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-2 font-mono font-semibold"><HighlightText text={entity.tableName} {query} />{#if entity.isReadOnly}<StatusBadge label={$t('read_only_badge')} tone="warning" />{/if}</span>
          <span class="block text-xs text-[color:var(--rvc-muted)]"><HighlightText text={entity.description ?? ''} {query} /></span>
          <span class="block font-mono text-[11px] text-[color:var(--rvc-muted)]"><HighlightText text={entity.tableSchema} {query} /></span>
        </span>
        <span class="text-xs text-[color:var(--rvc-muted)]">{entity.fieldCount} {$t('unit_fields')} / {entity.operationCount} {$t('unit_operations')}</span>
      </button>
    </SectionListRow>
  {/each}
  {#if filtered.length === 0}
    <div class="px-4 py-6 text-sm text-[color:var(--rvc-muted)]">{$t('search_no_match')}</div>
  {/if}
</SectionList>

<BusyOverlay show={viewModel.isReadOnlyUpdating} label={$t('busy_working')} />
