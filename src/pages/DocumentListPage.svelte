<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import ListRow from '@/shared/components/ListRow.svelte';
  import SearchBox from '@/shared/components/SearchBox.svelte';
  import StageRail from '@/shared/components/StageRail.svelte';
  import SelectionToolbar from '@/shared/components/SelectionToolbar.svelte';
  import SpecPreviewSheet from '@/shared/components/SpecPreviewSheet.svelte';
  import BusyOverlay from '@/shared/components/BusyOverlay.svelte';
  import { RowSelection } from '@/shared/selection/RowSelection.svelte';
  import type { DocumentViewModel } from '@/modules/document/viewmodels/DocumentViewModel.svelte';
  import { translate as t, language } from '@/shared/i18n/i18n.svelte';
  import { formatRelativeTime } from '@/shared/time/relativeTime';
  let {
    viewModel,
    onOpenDocument,
    onGenerateSdk
  }: {
    viewModel: DocumentViewModel;
    onOpenDocument: (documentId: string) => void;
    /** 次の成果物へ。契約面はこの行から引き継ぐ。 */
    onGenerateSdk?: (schemaName: string, profile: string) => void;
  } = $props();

  let query = $state('');
  const selection = new RowSelection();
  const filtered = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return viewModel.documents;
    return viewModel.documents.filter((document) =>
      `${document.title} ${document.description ?? ''} ${document.schemaName} ${document.profile} ${document.version}`
        .toLowerCase()
        .includes(needle)
    );
  });
  const filteredIds = $derived(filtered.map((document) => document.id));

  const selectedDocuments = $derived(filtered.filter((document) => selection.isSelected(document.id)));

  /**
   * 選んだ行の契約面。
   *
   * 契約面が混ざった選択では出力できない。postgrest と bff は別の契約で、
   * 1 つの成果物へまとめると、どちらの形なのか読めないものが出る。
   */
  const selectedProfile = $derived.by(() => {
    const profiles = new Set(selectedDocuments.map((document) => document.profile));
    return profiles.size === 1 ? [...profiles][0] : null;
  });

  function exportSelected(): void {
    if (!selectedProfile) return;
    void viewModel.exportSpecs(
      selectedDocuments.map((document) => document.schemaName),
      selectedProfile
    );
  }
</script>

<StageRail current="documents" />

<SearchBox bind:value={query} placeholder={$t('search_placeholder')} />

<SelectionToolbar
  allSelected={selection.isAllSelected(filteredIds)}
  partiallySelected={selection.isPartiallySelected(filteredIds)}
  selectedCount={selection.selectedWithin(filteredIds).length}
  onToggleAll={(on) => selection.setAll(filteredIds, on)}
>
  {#if selectedProfile === null}
    <span data-testid="mixed-profile" class="text-[11px]" style="color:var(--rvc-warning)">{$t('doc_mixed_profile')}</span>
  {/if}
  <button
    data-testid="generate-sdk"
    class="rounded-md bg-[color:var(--rvc-accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
    disabled={selectedProfile === null || selectedDocuments.length !== 1}
    onclick={() => {
      const target = selectedDocuments[0];
      if (target) onGenerateSdk?.(target.schemaName, target.profile);
    }}
  >{$t('sdk_generate_button')}</button>
  <button
    data-testid="export-spec"
    class="rounded-md bg-[color:var(--rvc-accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
    disabled={viewModel.isExporting || selectedProfile === null}
    onclick={exportSelected}
  >{$t('export_spec')}</button>
</SelectionToolbar>

<SectionList title={`${$t('sec_documents')} / ${filtered.length}`} detail={$t('doc_list_hint')}>
  {#each filtered as document}
    <ListRow
      testid="document-row"
      data={{ 'data-schema': document.schemaName, 'data-profile': document.profile }}
      icon={{ label: 'D', color: '#399ecc' }}
      title={document.title}
      subtitle={`${document.schemaName} · ${document.description ?? ''} · ${formatRelativeTime(document.updatedAt, $language)}`}
      {query}
      badges={[
        { testid: 'document-profile', label: document.profile, tone: document.profile === 'bff' ? 'success' : 'accent', data: { 'data-profile': document.profile } },
        { testid: 'document-version', label: document.version, tone: 'muted' }
      ]}
      selected={selection.isSelected(document.id)}
      onToggle={() => selection.toggle(document.id)}
      onOpen={() => onOpenDocument(String(document.id))}
      actions={onGenerateSdk
        ? [{
            testid: 'row-generate-sdk',
            label: $t('sdk_generate_button'),
            onClick: () => onGenerateSdk(document.schemaName, document.profile),
            data: { 'data-schema': document.schemaName, 'data-profile': document.profile }
          }]
        : []}
    />
  {/each}
  {#if filtered.length === 0}
    <div class="px-4 py-6 text-sm text-[color:var(--rvc-muted)]">{$t('search_no_match')}</div>
  {/if}
</SectionList>

<BusyOverlay show={viewModel.isExporting} label={$t('busy_working')} />
<SpecPreviewSheet specs={viewModel.previewSpecs} onClose={() => viewModel.closePreview()} />
