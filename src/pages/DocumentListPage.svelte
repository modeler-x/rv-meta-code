<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import type { DocumentViewModel } from '@/modules/document/viewmodels/DocumentViewModel.svelte';
  import { translate as t, language } from '@/shared/i18n/i18n.svelte';
  import { formatRelativeTime } from '@/shared/time/relativeTime';
  let { viewModel, onOpenDocument }: { viewModel: DocumentViewModel; onOpenDocument: (documentId: string) => void } = $props();
</script>

<SectionList title={`${$t('sec_documents')} / ${viewModel.documents.length}`}>
  {#each viewModel.documents as document}
    <SectionListRow isButton on:click={() => onOpenDocument(String(document.id))}>
      <IconTile label="D" color="#399ecc" />
      <span class="min-w-0 flex-1">
        <span class="block font-semibold">{document.title}</span>
        <span class="block text-xs text-[color:var(--rvc-muted)]">{document.description ?? ''}</span>
        <span class="block font-mono text-[11px] text-[color:var(--rvc-muted)]">{document.schemaName} · {formatRelativeTime(document.updatedAt, $language)}</span>
      </span>
      <span class="rounded bg-[color:var(--rvc-search)] px-2 py-1 text-xs font-semibold text-[color:var(--rvc-accent)]">{document.version}</span>
    </SectionListRow>
  {/each}
</SectionList>
