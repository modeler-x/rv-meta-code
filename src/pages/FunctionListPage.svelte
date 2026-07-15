<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import SearchBox from '@/shared/components/SearchBox.svelte';
  import BusyOverlay from '@/shared/components/BusyOverlay.svelte';
  import type { OperationGroupViewModel } from '@/modules/operation-group/viewmodels/OperationGroupViewModel.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  let {
    viewModel,
    onOpenGroup
  }: {
    viewModel: OperationGroupViewModel;
    onOpenGroup: (schemaName: string, groupKey: string) => void;
  } = $props();

  let query = $state('');
  const filtered = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return viewModel.groups;
    return viewModel.groups.filter((group) =>
      `${group.displayName} ${group.groupKey} ${group.schemaName} ${group.description ?? ''}`
        .toLowerCase()
        .includes(needle)
    );
  });
</script>

<SearchBox bind:value={query} placeholder={$t('search_placeholder')} />

<SectionList title={`${$t('title_functions')} / ${filtered.length}`}>
  {#each filtered as group}
    <SectionListRow isButton on:click={() => onOpenGroup(group.schemaName, group.groupKey)}>
      <IconTile label="G" color="#7a5af5" />
      <span class="min-w-0 flex-1">
        <span class="block font-semibold">{group.displayName}</span>
        <span class="block font-mono text-[11px] text-[color:var(--rvc-muted)]">{group.schemaName} · {group.groupKey}</span>
        {#if group.description}<span class="block text-xs text-[color:var(--rvc-muted)]">{group.description}</span>{/if}
      </span>
      <span class="text-xs text-[color:var(--rvc-muted)]">{group.operationCount} {$t('unit_operations')}</span>
    </SectionListRow>
  {/each}
  {#if filtered.length === 0 && !viewModel.isGroupsLoading}
    <div class="px-4 py-4 text-sm text-[color:var(--rvc-muted)]">
      {viewModel.groupsError ?? $t('fn_empty')}
    </div>
  {/if}
</SectionList>

<BusyOverlay show={viewModel.isGroupsLoading} label={$t('busy_working')} />
