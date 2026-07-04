<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import type { DocumentViewModel } from '@/modules/document/viewmodels/DocumentViewModel.svelte';
  import type { EntityViewModel } from '@/modules/entity/viewmodels/EntityViewModel.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  export let viewModel: DocumentViewModel;
  export let entityViewModel: EntityViewModel;
  export let onOpenDocument: (documentId: string) => void;
  function entityNames(entityIds: string[]): string {
    return entityIds.map((id) => entityViewModel.findEntity(id)?.name ?? id).join(', ');
  }
</script>

<SectionList title={$t('sec_documents')}>
  {#each viewModel.documents as document}
    <SectionListRow isButton>
      <IconTile label="D" color="#399ecc" />
      <span class="min-w-0 flex-1"><span class="block font-semibold">{document.name}</span><span class="block text-xs text-[color:var(--rvc-muted)]">{entityNames(document.entityIds)}</span></span>
      <span class="rounded bg-[color:var(--rvc-search)] px-2 py-1 text-xs font-semibold text-[color:var(--rvc-accent)]">{document.version}</span>
      <button class="text-[color:var(--rvc-accent)]" on:click={() => onOpenDocument(document.id)}>{$t('open')}</button>
    </SectionListRow>
  {/each}
</SectionList>
