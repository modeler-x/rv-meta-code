<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import ListRow from '@/shared/components/ListRow.svelte';
  import SearchBox from '@/shared/components/SearchBox.svelte';
  import StageRail from '@/shared/components/StageRail.svelte';
  import type { SdkGenerationViewModel } from '@/modules/sdk/viewmodels/SdkGenerationViewModel.svelte';
  import type { SdkRecord } from '@/modules/sdk/services/SdkHistory';
  import { translate as t, language } from '@/shared/i18n/i18n.svelte';
  import { formatRelativeTime } from '@/shared/time/relativeTime';

  /**
   * 生成した SDK の一覧。工程の最後の成果物。
   *
   * 生成物そのものはファイルシステム上にあるので、ここに並ぶのは「何をどの契約面から
   * 出したか」の記録。作り直しは同じ契約面の生成画面へ戻る。
   */
  let {
    viewModel,
    onRegenerate
  }: {
    viewModel: SdkGenerationViewModel;
    onRegenerate: (schemaName: string, profile: string) => void;
  } = $props();

  let query = $state('');
  let records = $state<SdkRecord[]>(viewModel.listHistory());

  const filtered = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return records;
    return records.filter((record) =>
      `${record.packageName} ${record.schemaName} ${record.profile} ${record.generatorId}`
        .toLowerCase()
        .includes(needle)
    );
  });

  function remove(packageName: string): void {
    records = viewModel.removeHistory(packageName);
  }
</script>

<StageRail current="sdkList" />

<SearchBox bind:value={query} placeholder={$t('search_placeholder')} />

<SectionList title={`${$t('nav_sdk')} / ${filtered.length}`} detail={$t('sdk_list_hint')}>
  {#each filtered as record}
    <ListRow
      testid="sdk-row"
      data={{ 'data-package': record.packageName, 'data-schema': record.schemaName, 'data-profile': record.profile }}
      icon={{ label: 'K', color: '#7b61c4' }}
      title={record.packageName}
      subtitle={`${record.fileCount} ${$t('sdk_unit_files')} · ${record.outputDirectory} · ${formatRelativeTime(record.generatedAt, $language)}`}
      {query}
      badges={[
        { testid: 'sdk-schema', label: record.schemaName, tone: 'accent', data: { 'data-schema': record.schemaName } },
        {
          testid: 'sdk-profile',
          label: record.profile,
          tone: record.profile === 'bff' ? 'success' : 'muted',
          data: { 'data-profile': record.profile }
        }
      ]}
      onOpen={() => onRegenerate(record.schemaName, record.profile)}
      actions={[
        {
          testid: 'regenerate-sdk',
          label: $t('mf_redraft'),
          onClick: () => onRegenerate(record.schemaName, record.profile),
          data: { 'data-schema': record.schemaName, 'data-profile': record.profile }
        },
        { testid: 'forget-sdk', label: $t('delete'), onClick: () => remove(record.packageName) }
      ]}
    />
  {/each}
  {#if filtered.length === 0}
    <div class="px-4 py-6 text-sm text-[color:var(--rvc-muted)]">
      {records.length === 0 ? $t('sdk_list_empty') : $t('search_no_match')}
    </div>
  {/if}
</SectionList>
