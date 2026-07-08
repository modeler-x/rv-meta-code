<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import SearchBox from '@/shared/components/SearchBox.svelte';
  import HighlightText from '@/shared/components/HighlightText.svelte';
  import type { EntityViewModel } from '@/modules/entity/viewmodels/EntityViewModel.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  let { viewModel, onOpenEntity }: { viewModel: EntityViewModel; onOpenEntity: (entityId: string) => void } = $props();

  let query = $state('');
  const filtered = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return viewModel.entities;
    return viewModel.entities.filter((entity) =>
      `${entity.tableName} ${entity.description ?? ''} ${entity.tableSchema}`.toLowerCase().includes(needle)
    );
  });
</script>

<SearchBox bind:value={query} placeholder={$t('search_placeholder')} />

<SectionList title={`${$t('sec_entities')} / ${filtered.length}`}>
  {#each filtered as entity}
    <SectionListRow isButton on:click={() => onOpenEntity(String(entity.id))}>
      <IconTile label="T" color="#0087aa" />
      <span class="min-w-0 flex-1">
        <span class="block font-mono font-semibold"><HighlightText text={entity.tableName} {query} /></span>
        <span class="block text-xs text-[color:var(--rvc-muted)]"><HighlightText text={entity.description ?? ''} {query} /></span>
        <span class="block font-mono text-[11px] text-[color:var(--rvc-muted)]"><HighlightText text={entity.tableSchema} {query} /></span>
      </span>
      <span class="text-xs text-[color:var(--rvc-muted)]">{entity.fieldCount} {$t('unit_fields')} / {entity.operationCount} {$t('unit_operations')}</span>
    </SectionListRow>
  {/each}
  {#if filtered.length === 0}
    <div class="px-4 py-6 text-sm text-[color:var(--rvc-muted)]">{$t('search_no_match')}</div>
  {/if}
</SectionList>
