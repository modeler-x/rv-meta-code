<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import type { SchemaViewModel } from '@/modules/schema/viewmodels/SchemaViewModel.svelte';
  import type { GenerationViewModel } from '@/modules/generation/viewmodels/GenerationViewModel.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  let { viewModel, generationViewModel }: { viewModel: SchemaViewModel; generationViewModel: GenerationViewModel } = $props();
</script>

<SectionList title={`${$t('sec_schemas')} / ${viewModel.state.schemas.length}`} detail={$t('schemas_hint')}>
  {#each viewModel.state.schemas as schema}
    <SectionListRow isButton>
      <IconTile label="S" color="#0090a8" />
      <span class="min-w-0 flex-1"><span class="block font-mono font-semibold">{schema.name}</span><span class="block text-xs text-[color:var(--rvc-muted)]">{schema.comment ?? ''}</span></span>
      <span class="text-xs text-[color:var(--rvc-muted)]">{schema.tableCount} {$t('unit_tables')} / {schema.viewCount} {$t('unit_views')}</span>
      <button class="rounded-md bg-[color:var(--rvc-accent)] px-3 py-1.5 text-xs font-semibold text-white" onclick={(event) => { event.stopPropagation(); generationViewModel.askGeneration(schema); }}>{$t('generate')}</button>
    </SectionListRow>
  {/each}
</SectionList>
