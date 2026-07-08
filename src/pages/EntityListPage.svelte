<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import type { EntityViewModel } from '@/modules/entity/viewmodels/EntityViewModel.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  let { viewModel, onOpenEntity }: { viewModel: EntityViewModel; onOpenEntity: (entityId: string) => void } = $props();
</script>

<SectionList title={`${$t('sec_entities')} / ${viewModel.entities.length}`}>
  {#each viewModel.entities as entity}
    <SectionListRow isButton on:click={() => onOpenEntity(String(entity.id))}>
      <IconTile label="T" color="#0087aa" />
      <span class="min-w-0 flex-1">
        <span class="block font-mono font-semibold">{entity.tableName}</span>
        <span class="block text-xs text-[color:var(--rvc-muted)]">{entity.description ?? ''}</span>
        <span class="block font-mono text-[11px] text-[color:var(--rvc-muted)]">{entity.tableSchema}</span>
      </span>
      <span class="text-xs text-[color:var(--rvc-muted)]">{entity.fieldCount} {$t('unit_fields')} / {entity.operationCount} {$t('unit_operations')}</span>
    </SectionListRow>
  {/each}
</SectionList>
