<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import MethodBadge from '@/shared/components/MethodBadge.svelte';
  import type { OpenApiDocumentSummary } from '@/modules/document/types/OpenApiDocumentSummary';
  import type { EntityViewModel } from '@/modules/entity/viewmodels/EntityViewModel.svelte';
  import type { OperationGroupViewModel } from '@/modules/operation-group/viewmodels/OperationGroupViewModel.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  let { document, entityViewModel, operationGroupViewModel, onOpenEntity, onOpenGroup }: {
    document: OpenApiDocumentSummary;
    entityViewModel: EntityViewModel;
    operationGroupViewModel: OperationGroupViewModel;
    onOpenEntity: (entityId: string) => void;
    onOpenGroup: (groupKey: string) => void;
  } = $props();
</script>

<div class="mb-6 flex items-center gap-3">
  <IconTile label="D" color="#399ecc" />
  <div>
    <h2 class="text-xl font-bold">{document.title}</h2>
    <p class="text-xs text-[color:var(--rvc-muted)]">{$t('openapi')} / {document.version} · {document.schemaName}</p>
  </div>
</div>
{#if document.description}<p class="mb-6 text-sm leading-6">{document.description}</p>{/if}

<SectionList title={`${$t('sec_doc_entities')} / ${entityViewModel.entities.length}`}>
  {#each entityViewModel.entities as entity}
    <SectionListRow isButton on:click={() => onOpenEntity(String(entity.id))}>
      <IconTile label="T" color="#0087aa" />
      <span class="min-w-0 flex-1">
        <span class="block font-mono font-semibold">{entity.tableName}</span>
        <span class="block text-xs text-[color:var(--rvc-muted)]">{entity.description ?? ''}</span>
      </span>
      <span class="text-xs text-[color:var(--rvc-muted)]">{entity.fieldCount} {$t('unit_fields')} / {entity.operationCount} {$t('unit_operations')}</span>
    </SectionListRow>
  {/each}
</SectionList>

{#if operationGroupViewModel.groups.length}
  <div class="mt-6"></div>
  <SectionList title={`${$t('sec_operation_groups')} / ${operationGroupViewModel.groups.length}`}>
    {#each operationGroupViewModel.groups as group}
      <SectionListRow isButton on:click={() => onOpenGroup(group.groupKey)}>
        <IconTile label="G" color="#7a5af5" />
        <span class="min-w-0 flex-1">
          <span class="block font-semibold">{group.displayName}</span>
          <span class="block font-mono text-[11px] text-[color:var(--rvc-muted)]">{group.groupKey}</span>
          {#if group.description}<span class="block text-xs text-[color:var(--rvc-muted)]">{group.description}</span>{/if}
        </span>
        <span class="text-xs text-[color:var(--rvc-muted)]">{group.operationCount} {$t('unit_operations')}</span>
      </SectionListRow>
    {/each}
  </SectionList>
{/if}
