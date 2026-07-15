<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import StatusBadge from '@/shared/components/StatusBadge.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import BusyOverlay from '@/shared/components/BusyOverlay.svelte';
  import type { SdkGenerationViewModel } from '@/modules/sdk/viewmodels/SdkGenerationViewModel.svelte';
  import {
    GENERATED_FILE_CATEGORY_ORDER,
    groupGeneratedFiles,
    type GeneratedFileCategory
  } from '@/modules/sdk/generatedFileCategory';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  import type { MessageKey } from '@/shared/i18n/messages';
  import { onMount } from 'svelte';

  let { viewModel, schema }: { viewModel: SdkGenerationViewModel; schema: string } = $props();

  // Generator / Profile は Registry / ストアから取得する（UI に固定配列を持たない）。
  onMount(() => {
    void viewModel.load();
  });

  let newProfileName = $state('');

  // input と select で高さを揃える（固定 h-9）。select はネイティブ矢印を残しつつ box 高さを統一。
  const inputClass =
    'h-9 w-full rounded-md border border-[color:var(--rvc-border)] bg-white px-3 text-sm';
  // フィールド行に並ぶボタンも同じ高さに合わせる。
  const inlineButtonClass =
    'h-9 shrink-0 rounded-md border border-[color:var(--rvc-border)] px-3 text-sm font-semibold disabled:opacity-50';

  const categoryLabelKey: Record<GeneratedFileCategory, MessageKey> = {
    source: 'sdk_cat_source',
    apiDocs: 'sdk_cat_api_docs',
    modelDocs: 'sdk_cat_model_docs',
    tests: 'sdk_cat_tests',
    metadata: 'sdk_cat_metadata',
    build: 'sdk_cat_build'
  };

  // 生成物を用途カテゴリへ分類し、空でないカテゴリだけ表示する。
  const totalFiles = $derived(viewModel.result?.generatedFiles?.length ?? 0);
  const grouped = $derived(groupGeneratedFiles(viewModel.result?.generatedFiles ?? []));
  const shownCategories = $derived(
    GENERATED_FILE_CATEGORY_ORDER.filter((c) => grouped[c].length > 0)
  );

  let copied = $state(false);
  async function copyError(): Promise<void> {
    const text = `${viewModel.errorCode ?? ''}\n${viewModel.errorMessage ?? ''}`.trim();
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      // クリップボード不可の場合はテキスト選択で対応してもらう。
    }
  }
</script>

<div class="mb-6 flex items-center gap-3">
  <IconTile label="S" color="#1a9e4b" />
  <div>
    <h2 class="text-xl font-bold">{$t('sdk_title')}</h2>
    <p class="font-mono text-xs text-[color:var(--rvc-muted)]">{schema}</p>
  </div>
</div>

<div class="space-y-3">
  {#if viewModel.profiles.length > 0}
    <label class="block">
      <span class="mb-1 block text-xs text-[color:var(--rvc-muted)]">{$t('sdk_profile')}</span>
      <div class="flex gap-2">
        <select
          class={inputClass}
          value={viewModel.selectedProfileName}
          onchange={(e) => viewModel.applyProfile((e.currentTarget as HTMLSelectElement).value)}
        >
          <option value="">{$t('sdk_profile_none')}</option>
          {#each viewModel.profiles as profile}
            <option value={profile.name}>{profile.name}{profile.schemaName ? ` (${profile.schemaName})` : ''}</option>
          {/each}
        </select>
        <button
          class={inlineButtonClass}
          disabled={viewModel.selectedProfileName === ''}
          onclick={() => viewModel.deleteProfile(viewModel.selectedProfileName)}
        >{$t('sdk_profile_delete')}</button>
      </div>
    </label>
  {/if}
  <label class="block">
    <span class="mb-1 block text-xs text-[color:var(--rvc-muted)]">{$t('sdk_generator')}</span>
    <select class={inputClass} bind:value={viewModel.generatorId}>
      {#each viewModel.generators as generator}
        <option value={generator.id}>
          {generator.displayName}{generator.isAvailable ? (generator.version ? ` — ${generator.version}` : '') : ` — ${$t('sdk_generator_unavailable')}`}
        </option>
      {/each}
    </select>
    {#if viewModel.selectedGenerator && !viewModel.selectedGenerator.isAvailable}
      <p class="mt-1 text-[11px] text-[color:#e5484d]">{$t('sdk_generator_unavailable_hint')}</p>
    {/if}
  </label>
  <label class="block">
    <span class="mb-1 block text-xs text-[color:var(--rvc-muted)]">{$t('sdk_target')}</span>
    <select class={inputClass} bind:value={viewModel.generatorName}>
      {#each viewModel.targets as target}<option value={target.name}>{target.displayName}</option>{/each}
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
  <div class="block">
    <span class="mb-1 block text-xs text-[color:var(--rvc-muted)]">{$t('sdk_output_dir')}</span>
    <div class="flex gap-2">
      <input class={inputClass} placeholder="/absolute/path/to/output" bind:value={viewModel.outputDirectory} />
      <button
        class={inlineButtonClass}
        onclick={() => viewModel.pickOutputDirectory()}
      >{$t('sdk_browse')}</button>
    </div>
    <p class="mt-1 text-[11px] leading-5 text-[color:var(--rvc-muted)]">{$t('sdk_naming_guide')}</p>
    {#if viewModel.pickError}
      <p class="mt-1 select-text text-[11px] text-[color:#e5484d]">{viewModel.pickError}</p>
    {/if}
  </div>

  <div class="block">
    <span class="mb-1 block text-xs text-[color:var(--rvc-muted)]">{$t('sdk_profile_save')}</span>
    <div class="flex gap-2">
      <input class={inputClass} placeholder={$t('sdk_profile_name_placeholder')} bind:value={newProfileName} />
      <button
        class={inlineButtonClass}
        disabled={newProfileName.trim() === ''}
        onclick={async () => {
          await viewModel.saveProfile(newProfileName, schema);
          if (!viewModel.profileError) newProfileName = '';
        }}
      >{$t('sdk_profile_save')}</button>
    </div>
    {#if viewModel.profileError}
      <p class="mt-1 select-text text-[11px] text-[color:#e5484d]">{viewModel.profileError}</p>
    {/if}
  </div>

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
    <div class="flex items-center gap-2">
      <p class="text-sm font-semibold text-[color:#e5484d]">{$t('sdk_error')}</p>
      <span class="flex-1"></span>
      <button
        class="rounded border border-[color:var(--rvc-border)] bg-white px-2 py-0.5 text-[11px] font-semibold"
        onclick={() => copyError()}
      >{copied ? $t('sdk_copied') : $t('sdk_copy')}</button>
    </div>
    {#if viewModel.errorCode}<p class="mt-1 select-text font-mono text-[11px] text-[color:var(--rvc-muted)]">{viewModel.errorCode}</p>{/if}
    <pre class="mt-1 max-h-64 select-text overflow-auto whitespace-pre-wrap break-words text-xs">{viewModel.errorMessage}</pre>
  </div>
{/if}

{#if viewModel.result}
  <div class="mt-6">
    <SectionList title={`${$t('sdk_result')} / ${totalFiles}`}>
      <SectionListRow>
        <span class="text-xs text-[color:var(--rvc-muted)]">{$t('sdk_output')}</span>
        <span class="font-mono text-xs">{viewModel.result.outputDirectory}</span>
        <span class="flex-1"></span>
        <span class="text-xs text-[color:var(--rvc-muted)]">{viewModel.result.durationMs} ms</span>
      </SectionListRow>
      {#if totalFiles === 0}
        <SectionListRow><span class="text-xs text-[color:var(--rvc-muted)]">{$t('sdk_no_files')}</span></SectionListRow>
      {/if}
    </SectionList>
    {#each shownCategories as category}
      <div class="mt-4"></div>
      <SectionList title={`${$t(categoryLabelKey[category])} / ${grouped[category].length}`}>
        {#each grouped[category] as file}
          <SectionListRow><span class="font-mono text-xs">{file}</span></SectionListRow>
        {/each}
      </SectionList>
    {/each}
  </div>
{/if}

<BusyOverlay show={viewModel.isRunning} label={$t('sdk_running')} />
