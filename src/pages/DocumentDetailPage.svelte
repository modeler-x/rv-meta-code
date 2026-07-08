<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import type { OpenApiDocumentSummary } from '@/modules/document/types/OpenApiDocumentSummary';
  import type { EntityViewModel } from '@/modules/entity/viewmodels/EntityViewModel.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  let { document, entityViewModel, onOpenEntity }: { document: OpenApiDocumentSummary; entityViewModel: EntityViewModel; onOpenEntity: (entityId: string) => void } = $props();
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
