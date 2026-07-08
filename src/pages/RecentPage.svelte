<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import type { RecentViewModel } from '@/modules/recent/viewmodels/RecentViewModel.svelte';
  import type { RecentActivity } from '@/modules/recent/types/RecentActivity';
  import { translate as t, language } from '@/shared/i18n/i18n.svelte';
  import { formatRelativeTime } from '@/shared/time/relativeTime';
  let { viewModel, onOpen }: { viewModel: RecentViewModel; onOpen: (activity: RecentActivity) => void } = $props();

  const color: Record<RecentActivity['kind'], string> = {
    document: '#399ecc',
    schema: '#0090a8',
    entity: '#0087aa',
    operation: '#5bb4ce'
  };
</script>

<SectionList title={`${$t('nav_recent')} / ${viewModel.activities.length}`}>
  {#if viewModel.activities.length === 0}
    <div class="px-4 py-6 text-sm text-[color:var(--rvc-muted)]">{$t('recent_empty')}</div>
  {/if}
  {#each viewModel.activities as activity (activity.id)}
    <SectionListRow isButton on:click={() => onOpen(activity)}>
      <IconTile label={activity.kind[0].toUpperCase()} color={color[activity.kind]} />
      <span class="min-w-0 flex-1">
        <span class="block font-semibold">{activity.title}</span>
        <span class="block text-xs text-[color:var(--rvc-muted)]">{activity.subtitle}</span>
      </span>
      <span class="text-xs text-[color:var(--rvc-muted)]">{formatRelativeTime(activity.at, $language)}</span>
    </SectionListRow>
  {/each}
</SectionList>
