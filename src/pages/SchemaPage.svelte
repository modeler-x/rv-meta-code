<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import SearchBox from '@/shared/components/SearchBox.svelte';
  import HighlightText from '@/shared/components/HighlightText.svelte';
  import type { SchemaViewModel } from '@/modules/schema/viewmodels/SchemaViewModel.svelte';
  import type { GenerationViewModel } from '@/modules/generation/viewmodels/GenerationViewModel.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  let { viewModel, generationViewModel }: { viewModel: SchemaViewModel; generationViewModel: GenerationViewModel } = $props();

  let query = $state('');
  const filtered = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return viewModel.state.schemas;
    return viewModel.state.schemas.filter((schema) =>
      `${schema.name} ${schema.comment ?? ''}`.toLowerCase().includes(needle)
    );
  });
</script>

<SearchBox bind:value={query} placeholder={$t('search_placeholder')} />

<SectionList title={`${$t('sec_schemas')} / ${filtered.length}`} detail={$t('schemas_hint')}>
  {#each filtered as schema}
    <SectionListRow isButton>
      <IconTile label="S" color="#0090a8" />
      <span class="min-w-0 flex-1"><span class="block font-mono font-semibold"><HighlightText text={schema.name} {query} /></span><span class="block text-xs text-[color:var(--rvc-muted)]"><HighlightText text={schema.comment ?? ''} {query} /></span></span>
      <span class="text-xs text-[color:var(--rvc-muted)]">{schema.tableCount} {$t('unit_tables')} / {schema.viewCount} {$t('unit_views')}</span>
      <button class="rounded-md bg-[color:var(--rvc-accent)] px-3 py-1.5 text-xs font-semibold text-white" onclick={(event) => { event.stopPropagation(); generationViewModel.askGeneration(schema); }}>{$t('generate')}</button>
    </SectionListRow>
  {/each}
  {#if filtered.length === 0}
    <div class="px-4 py-6 text-sm text-[color:var(--rvc-muted)]">{$t('search_no_match')}</div>
  {/if}
</SectionList>
