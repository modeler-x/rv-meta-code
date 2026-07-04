<script lang="ts">
  import { RecentViewModel } from '@/modules/recent/viewmodels/RecentViewModel.svelte';
  import { appProvider } from '@/app/providers/AppProvider';
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  export let onOpenEntity: (entityId: string) => void;
  export let onOpenDocument: (documentId: string) => void;
  const viewModel = new RecentViewModel(appProvider.recentService);
  viewModel.loadRecentActivities();
</script>

<SectionList title={$t('nav_recent')}>
  {#each viewModel.activities as activity}
    <SectionListRow isButton><IconTile label={activity.kind[0].toUpperCase()} color={activity.kind === 'document' ? '#399ecc' : '#0087aa'} /><span class="flex-1"><span class="block font-semibold">{activity.title}</span><span class="block text-xs text-[color:var(--rvc-muted)]">{activity.subtitle}</span></span><span class="text-xs text-[color:var(--rvc-muted)]">{activity.timeLabel}</span><button class="text-[color:var(--rvc-accent)]" on:click={() => activity.kind === 'document' ? onOpenDocument(activity.targetId ?? '') : onOpenEntity(activity.targetId ?? '')}>{$t('open')}</button></SectionListRow>
  {/each}
</SectionList>
