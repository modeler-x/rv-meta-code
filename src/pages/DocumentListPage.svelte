<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import SearchBox from '@/shared/components/SearchBox.svelte';
  import HighlightText from '@/shared/components/HighlightText.svelte';
  import type { DocumentViewModel } from '@/modules/document/viewmodels/DocumentViewModel.svelte';
  import { translate as t, language } from '@/shared/i18n/i18n.svelte';
  import { formatRelativeTime } from '@/shared/time/relativeTime';
  let { viewModel, onOpenDocument }: { viewModel: DocumentViewModel; onOpenDocument: (documentId: string) => void } = $props();

  let query = $state('');
  const filtered = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return viewModel.documents;
    return viewModel.documents.filter((document) =>
      `${document.title} ${document.description ?? ''} ${document.schemaName} ${document.version}`.toLowerCase().includes(needle)
    );
  });
</script>

<SearchBox bind:value={query} placeholder={$t('search_placeholder')} />

<SectionList title={`${$t('sec_documents')} / ${filtered.length}`}>
  {#each filtered as document}
    <SectionListRow isButton on:click={() => onOpenDocument(String(document.id))}>
      <IconTile label="D" color="#399ecc" />
      <span class="min-w-0 flex-1">
        <span class="block font-semibold"><HighlightText text={document.title} {query} /></span>
        <span class="block text-xs text-[color:var(--rvc-muted)]"><HighlightText text={document.description ?? ''} {query} /></span>
        <span class="block font-mono text-[11px] text-[color:var(--rvc-muted)]"><HighlightText text={document.schemaName} {query} /> · {formatRelativeTime(document.updatedAt, $language)}</span>
      </span>
      <span class="rounded bg-[color:var(--rvc-search)] px-2 py-1 text-xs font-semibold text-[color:var(--rvc-accent)]">{document.version}</span>
    </SectionListRow>
  {/each}
  {#if filtered.length === 0}
    <div class="px-4 py-6 text-sm text-[color:var(--rvc-muted)]">{$t('search_no_match')}</div>
  {/if}
</SectionList>
