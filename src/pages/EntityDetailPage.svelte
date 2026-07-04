<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import MethodBadge from '@/shared/components/MethodBadge.svelte';
  import StatusBadge from '@/shared/components/StatusBadge.svelte';
  import type { EntitySummary } from '@/modules/entity/types/EntitySummary';
  import type { OperationSummary } from '@/modules/operation/types/OperationSummary';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  export let entity: EntitySummary;
  export let operations: OperationSummary[];
  export let onOpenOperation: (operationId: string) => void;
</script>

<div class="mb-5 flex items-center gap-3"><IconTile label={entity.kind === 'Table' ? 'T' : 'V'} color={entity.kind === 'Table' ? '#0087aa' : '#5bb4ce'} /><div><h2 class="font-mono text-xl font-bold">{entity.name}</h2><p class="text-xs text-[color:var(--rvc-muted)]">{entity.schema}.{entity.name} / {entity.kind}</p></div></div>
<p class="mb-6 text-sm leading-6">{entity.description}</p>
<SectionList title={`${$t('sec_fields')} / ${entity.columns.length}`}>
  {#each entity.columns as column, index}
    <SectionListRow><span class="w-7 rounded bg-[color:var(--rvc-search)] py-1 text-center font-mono text-xs text-[color:var(--rvc-muted)]">{String(index + 1).padStart(2, '0')}</span><span class="flex-1"><span class="font-mono font-semibold">{column.name}</span> {#if column.badge}<StatusBadge label={column.badge} tone={column.badge === 'UQ' ? 'warning' : 'accent'} />{/if}{#if column.extra}<span class="ml-2 font-mono text-xs text-[color:var(--rvc-muted)]">{column.extra}</span>{/if}</span><span class="rounded border border-[color:var(--rvc-border)] bg-[color:var(--rvc-search)] px-2 py-1 font-mono text-xs">{column.type}</span></SectionListRow>
  {/each}
</SectionList>
<SectionList title={`${$t('sec_operations')} / ${operations.length}`}>
  {#each operations as operation}
    <SectionListRow isButton><MethodBadge method={operation.method} /><span class="flex-1"><span class="block font-mono font-semibold">{operation.path}</span><span class="block text-xs text-[color:var(--rvc-muted)]">{operation.summary}</span></span><button class="text-[color:var(--rvc-accent)]" on:click={() => onOpenOperation(operation.id)}>{$t('open')}</button></SectionListRow>
  {/each}
</SectionList>
<SectionList title={`${$t('sec_relationships')} / ${entity.relations.length}`}>
  {#each entity.relations as relation}
    <SectionListRow><StatusBadge label={relation.kind} tone={relation.kind === 'FK' ? 'accent' : relation.kind === 'SRC' ? 'success' : 'muted'} /><span class="flex-1 font-mono text-xs">{relation.text}</span><span class="text-xs text-[color:var(--rvc-muted)]">{relation.rule}</span></SectionListRow>
  {/each}
</SectionList>
