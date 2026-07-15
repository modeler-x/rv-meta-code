<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import StatusBadge from '@/shared/components/StatusBadge.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import BusyOverlay from '@/shared/components/BusyOverlay.svelte';
  import type { SdkGenerationViewModel } from '@/modules/sdk/viewmodels/SdkGenerationViewModel.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  let { viewModel, schema }: { viewModel: SdkGenerationViewModel; schema: string } = $props();

  const generators = ['openapi-generator-cli'];
  const languages = ['typescript-fetch', 'typescript-axios', 'typescript-node'];

  const inputClass =
    'w-full rounded-md border border-[color:var(--rvc-border)] bg-white px-3 py-1.5 text-sm';
</script>

<div class="mb-6 flex items-center gap-3">
  <IconTile label="S" color="#1a9e4b" />
  <div>
    <h2 class="text-xl font-bold">{$t('sdk_title')}</h2>
    <p class="font-mono text-xs text-[color:var(--rvc-muted)]">{schema}</p>
  </div>
</div>

<div class="space-y-3">
  <label class="block">
    <span class="mb-1 block text-xs text-[color:var(--rvc-muted)]">{$t('sdk_generator')}</span>
    <select class={inputClass} bind:value={viewModel.generatorId}>
      {#each generators as generator}<option value={generator}>{generator}</option>{/each}
    </select>
  </label>
  <label class="block">
    <span class="mb-1 block text-xs text-[color:var(--rvc-muted)]">{$t('sdk_language')}</span>
    <select class={inputClass} bind:value={viewModel.language}>
      {#each languages as language}<option value={language}>{language}</option>{/each}
    </select>
  </label>
  <label class="block">
    <span class="mb-1 block text-xs text-[color:var(--rvc-muted)]">{$t('sdk_package_name')}</span>
    <input class={inputClass} bind:value={viewModel.packageName} />
  </label>
  <label class="block">
    <span class="mb-1 block text-xs text-[color:var(--rvc-muted)]">{$t('sdk_package_version')}</span>
    <input class={inputClass} bind:value={viewModel.packageVersion} />
  </label>
  <label class="block">
    <span class="mb-1 block text-xs text-[color:var(--rvc-muted)]">{$t('sdk_output_dir')}</span>
    <input class={inputClass} placeholder="/absolute/path/to/output" bind:value={viewModel.outputDirectory} />
  </label>

  <button
    class="rounded-md bg-[color:var(--rvc-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
    disabled={!viewModel.canRun || viewModel.isRunning}
    onclick={() => viewModel.run(schema)}
  >{viewModel.isRunning ? $t('sdk_running') : $t('sdk_run')}</button>
</div>

{#if viewModel.report}
  <div class="mt-6">
    <SectionList title={$t('sdk_validation')}>
      <SectionListRow>
        <span class="text-sm font-semibold">{$t('sdk_validation')}</span>
        <span class="flex-1"></span>
        <StatusBadge label={viewModel.report.isValid ? $t('sdk_valid') : $t('sdk_invalid')} tone={viewModel.report.isValid ? 'success' : 'danger'} />
      </SectionListRow>
      {#each viewModel.report.errors as issue}
        <SectionListRow>
          <span class="rounded bg-[color:var(--rvc-search)] px-1.5 py-0.5 font-mono text-[11px] text-[color:#e5484d]">{issue.rule}</span>
          <span class="font-mono text-[11px] text-[color:var(--rvc-muted)]">{issue.pointer}</span>
          <span class="text-xs">{issue.message}</span>
        </SectionListRow>
      {/each}
      {#each viewModel.report.warnings as issue}
        <SectionListRow>
          <span class="rounded bg-[color:var(--rvc-search)] px-1.5 py-0.5 font-mono text-[11px] text-[color:#b7791f]">{issue.rule}</span>
          <span class="font-mono text-[11px] text-[color:var(--rvc-muted)]">{issue.pointer}</span>
          <span class="text-xs">{issue.message}</span>
        </SectionListRow>
      {/each}
    </SectionList>
    {#if viewModel.phase === 'invalid'}
      <p class="mt-2 text-xs text-[color:#e5484d]">{$t('sdk_no_generate_on_invalid')}</p>
    {/if}
  </div>
{/if}

{#if viewModel.phase === 'error'}
  <div class="mt-6 rounded-md border border-[color:#e5484d] bg-[color:#fff5f5] p-3">
    <p class="text-sm font-semibold text-[color:#e5484d]">{$t('sdk_error')}</p>
    {#if viewModel.errorCode}<p class="font-mono text-[11px] text-[color:var(--rvc-muted)]">{viewModel.errorCode}</p>{/if}
    <p class="text-xs">{viewModel.errorMessage}</p>
  </div>
{/if}

{#if viewModel.result}
  <div class="mt-6">
    <SectionList title={`${$t('sdk_result')} / ${viewModel.result.generatedFiles.length}`}>
      <SectionListRow>
        <span class="text-xs text-[color:var(--rvc-muted)]">{$t('sdk_output')}</span>
        <span class="font-mono text-xs">{viewModel.result.outputDirectory}</span>
        <span class="flex-1"></span>
        <span class="text-xs text-[color:var(--rvc-muted)]">{viewModel.result.durationMs} ms</span>
      </SectionListRow>
      {#each viewModel.result.generatedFiles as file}
        <SectionListRow><span class="font-mono text-xs">{file}</span></SectionListRow>
      {/each}
      {#if viewModel.result.generatedFiles.length === 0}
        <SectionListRow><span class="text-xs text-[color:var(--rvc-muted)]">{$t('sdk_no_files')}</span></SectionListRow>
      {/if}
    </SectionList>
  </div>
{/if}

<BusyOverlay show={viewModel.isRunning} label={$t('sdk_running')} />
