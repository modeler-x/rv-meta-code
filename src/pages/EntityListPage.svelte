<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import type { EntityViewModel } from '@/modules/entity/viewmodels/EntityViewModel.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  export let viewModel: EntityViewModel;
  export let onOpenEntity: (entityId: string) => void;
</script>

<SectionList title={`${$t('sec_tables')} / ${viewModel.tables.length}`}>
  {#each viewModel.tables as entity}
    <SectionListRow isButton><IconTile label="T" color="#0087aa" /><span class="flex-1"><span class="block font-mono font-semibold">{entity.name}</span><span class="block text-xs text-[color:var(--rvc-muted)]">{entity.summary}</span></span><span class="text-xs text-[color:var(--rvc-muted)]">{entity.rowCountLabel}</span><button class="text-[color:var(--rvc-accent)]" on:click={() => onOpenEntity(entity.id)}>{$t('open')}</button></SectionListRow>
  {/each}
</SectionList>
<SectionList title={`${$t('sec_views')} / ${viewModel.views.length}`}>
  {#each viewModel.views as entity}
    <SectionListRow isButton><IconTile label="V" color="#5bb4ce" /><span class="flex-1"><span class="block font-mono font-semibold">{entity.name}</span><span class="block text-xs text-[color:var(--rvc-muted)]">{entity.summary}</span></span><span class="text-xs text-[color:var(--rvc-muted)]">{entity.rowCountLabel}</span><button class="text-[color:var(--rvc-accent)]" on:click={() => onOpenEntity(entity.id)}>{$t('open')}</button></SectionListRow>
  {/each}
</SectionList>
