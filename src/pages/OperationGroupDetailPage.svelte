<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import MethodBadge from '@/shared/components/MethodBadge.svelte';
  import BusyOverlay from '@/shared/components/BusyOverlay.svelte';
  import type { OperationGroupSummary } from '@/modules/operation-group/types/OperationGroupSummary';
  import type { OperationSummary } from '@/modules/operation/types/OperationSummary';
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  let {
    group,
    operations,
    isLoading = false,
    onOpenOperation
  }: {
    group: OperationGroupSummary;
    operations: OperationSummary[];
    isLoading?: boolean;
    onOpenOperation: (operationRowId: string) => void;
  } = $props();
</script>

<div class="mb-6 flex items-center gap-3">
  <IconTile label="G" color="#7a5af5" />
  <div>
    <h2 class="text-xl font-bold">{group.displayName}</h2>
    <p class="font-mono text-xs text-[color:var(--rvc-muted)]">{group.groupKey}</p>
  </div>
</div>
{#if group.description}<p class="mb-6 text-sm leading-6">{group.description}</p>{/if}

<SectionList title={`${$t('sec_operations')} / ${operations.length}`}>
  {#each operations as operation}
    <SectionListRow isButton on:click={() => onOpenOperation(String(operation.id))}>
      <MethodBadge method={operation.method} />
      <span class="min-w-0 flex-1">
        <span class="block font-mono font-semibold">{operation.path}</span>
        <span class="block font-mono text-[11px] text-[color:var(--rvc-muted)]">{operation.operationId}</span>
        {#if operation.summary}<span class="block text-xs text-[color:var(--rvc-muted)]">{operation.summary}</span>{/if}
      </span>
    </SectionListRow>
  {/each}
  {#if operations.length === 0}
    <div class="px-4 py-6 text-sm text-[color:var(--rvc-muted)]">{$t('search_no_match')}</div>
  {/if}
</SectionList>

<BusyOverlay show={isLoading} label={$t('busy_working')} />
