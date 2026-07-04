<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import type { OpenApiDocumentSummary } from '@/modules/document/types/OpenApiDocumentSummary';
  import type { EntityViewModel } from '@/modules/entity/viewmodels/EntityViewModel.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  export let document: OpenApiDocumentSummary;
  export let entityViewModel: EntityViewModel;
  export let onOpenEntity: (entityId: string) => void;
</script>

<div class="mb-6 flex items-center gap-3"><IconTile label="D" color="#399ecc" /><div><h2 class="text-xl font-bold">{document.name}</h2><p class="text-xs text-[color:var(--rvc-muted)]">{$t('openapi')} / {document.version}</p></div></div>
<p class="mb-6 text-sm leading-6">{document.description}</p>
<SectionList title={`${$t('sec_doc_entities')} / ${document.entityIds.length}`}>
  {#each document.entityIds as entityId}
    {@const entity = entityViewModel.findEntity(entityId)}
    {#if entity}
      <SectionListRow isButton>
        <IconTile label={entity.kind === 'Table' ? 'T' : 'V'} color={entity.kind === 'Table' ? '#0087aa' : '#5bb4ce'} />
        <span class="flex-1"><span class="block font-mono font-semibold">{entity.name}</span><span class="block text-xs text-[color:var(--rvc-muted)]">{entity.kind}</span></span>
        <button class="text-[color:var(--rvc-accent)]" on:click={() => onOpenEntity(entity.id)}>{$t('open')}</button>
      </SectionListRow>
    {/if}
  {/each}
</SectionList>
