<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import MethodBadge from '@/shared/components/MethodBadge.svelte';
  import StatusBadge from '@/shared/components/StatusBadge.svelte';
  import BusyOverlay from '@/shared/components/BusyOverlay.svelte';
  import type { EntitySummary, EntityField, EntityRelation } from '@/modules/entity/types/EntitySummary';
  import type { OperationSummary } from '@/modules/operation/types/OperationSummary';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  export let entity: EntitySummary;
  export let fields: EntityField[];
  export let operations: OperationSummary[];
  export let relations: EntityRelation[] = [];
  export let onOpenOperation: (operationId: string) => void;
  export let onToggleReadOnly: (isReadOnly: boolean) => void = () => {};
  export let isReadOnlyUpdating = false;

  function fieldType(field: EntityField): string {
    const schema = field.jsonSchema ?? {};
    const type = typeof schema.type === 'string' ? schema.type : 'object';
    const format = typeof schema.format === 'string' ? schema.format : '';
    return format ? `${type} · ${format}` : type;
  }
</script>

<div class="mb-5 flex items-center gap-3">
  <IconTile label="T" color="#0087aa" />
  <div>
    <h2 class="font-mono text-xl font-bold">{entity.tableName}</h2>
    <p class="text-xs text-[color:var(--rvc-muted)]">{entity.tableSchema}.{entity.tableName}</p>
  </div>
</div>
{#if entity.description}<p class="mb-4 text-sm leading-6">{entity.description}</p>{/if}

<div class="mb-6 flex items-center justify-between rounded-lg border border-[color:var(--rvc-border)] bg-[color:var(--rvc-search)] px-4 py-3">
  <div class="min-w-0">
    <p class="text-sm font-semibold">{$t('entity_read_only')}</p>
    <p class="text-xs text-[color:var(--rvc-muted)]">{$t('entity_read_only_hint')}</p>
  </div>
  <input
    type="checkbox"
    class="toggle toggle-sm"
    checked={entity.isReadOnly}
    disabled={isReadOnlyUpdating}
    on:change={(event) => onToggleReadOnly(event.currentTarget.checked)}
  />
</div>

<SectionList title={`${$t('sec_fields')} / ${fields.length}`}>
  {#each fields as field}
    <SectionListRow>
      <span class="w-7 rounded bg-[color:var(--rvc-search)] py-1 text-center font-mono text-xs text-[color:var(--rvc-muted)]">{String(field.ordinalPosition).padStart(2, '0')}</span>
      <span class="flex-1">
        <span class="font-mono font-semibold">{field.columnName}</span>
        {#if field.isPrimaryKey}<StatusBadge label="PK" tone="warning" />{/if}
        {#if field.required}<StatusBadge label="REQ" tone="accent" />{/if}
        {#if field.isReadOnly}<StatusBadge label="RO" tone="muted" />{/if}
        {#if field.description}<span class="ml-2 text-xs text-[color:var(--rvc-muted)]">{field.description}</span>{/if}
      </span>
      <span class="rounded border border-[color:var(--rvc-border)] bg-[color:var(--rvc-search)] px-2 py-1 font-mono text-xs">{fieldType(field)}</span>
    </SectionListRow>
  {/each}
</SectionList>

<SectionList title={`${$t('sec_operations')} / ${operations.length}`}>
  {#each operations as operation}
    <SectionListRow isButton on:click={() => onOpenOperation(String(operation.id))}>
      <MethodBadge method={operation.method} />
      <span class="min-w-0 flex-1">
        <span class="block font-mono font-semibold">{operation.path}</span>
        <span class="block text-xs text-[color:var(--rvc-muted)]">{operation.summary ?? ''}</span>
      </span>
    </SectionListRow>
  {/each}
</SectionList>

{#if relations.length}
  <SectionList title={`${$t('sec_relationships')} / ${relations.length}`}>
    {#each relations as relation}
      <SectionListRow>
        <StatusBadge label={relation.direction === 'outgoing' ? $t('rel_outgoing') : $t('rel_incoming')} tone={relation.direction === 'outgoing' ? 'accent' : 'muted'} />
        <span class="min-w-0 flex-1 font-mono text-xs">
          {relation.fromSchema ?? '?'}.{relation.fromTable ?? '?'}({relation.fromColumns.join(', ')})
          <span class="text-[color:var(--rvc-muted)]">→</span>
          {relation.toTableSchema}.{relation.toTableName}({relation.toColumns.join(', ')})
        </span>
        <span class="font-mono text-[11px] text-[color:var(--rvc-muted)]">{relation.constraintName}</span>
      </SectionListRow>
    {/each}
  </SectionList>
{/if}

<BusyOverlay show={isReadOnlyUpdating} label={$t('busy_working')} />
