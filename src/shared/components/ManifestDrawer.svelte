<script lang="ts">
  import Drawer from '@/shared/components/Drawer.svelte';
  import DiagnosticList from '@/shared/components/DiagnosticList.svelte';
  import StatusBadge from '@/shared/components/StatusBadge.svelte';
  import SegmentedControl from '@/shared/components/SegmentedControl.svelte';
  import EffectiveFieldTable, { type OverrideRequest } from '@/shared/components/EffectiveFieldTable.svelte';
  import type { ManifestField } from '@/modules/manifest/types/ManifestField';
  import type { ManifestViewModel } from '@/modules/manifest/viewmodels/ManifestViewModel.svelte';
  import {
    GENERATION_MODES,
    OPERATION_ID_STYLES,
    PROFILE_NAMES,
    type ManifestProfile,
    type ProfileName
  } from '@/modules/manifest/types/Manifest';
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  // 診断はスキーマ単位でしか意味を持たない指摘（未宣言の関数など）を含むので、
  // operation ではなく manifest の責務として、ここに集約する。
  // profiles / defaults も operation ごとに変わらないので同じ場所に置く。
  let {
    viewModel,
    schemaName,
    onClose,
    onOpenOperation,
    onOpenHelp
  }: {
    viewModel: ManifestViewModel;
    schemaName: string;
    onClose: () => void;
    onOpenOperation: (functionKey: string) => void;
    onOpenHelp?: (page: string) => void;
  } = $props();

  type Tab = 'profiles' | 'defaults';
  let tab = $state<Tab>('profiles');

  // 診断はここに置かない。複数スキーマをまとめて見るものなので、一覧の一括操作にある。
  // ここは編集（profile / defaults）だけを扱い、情報の性質と操作を一致させる。
  const tabs = $derived([
    { label: $t('mf_sec_profiles'), value: 'profiles' },
    { label: $t('mf_sec_defaults'), value: 'defaults' }
  ]);

  function override(profile: ProfileName, request: OverrideRequest): void {
    // profiles / defaults の項目は、その階層自身へ書く。範囲を選ばせる必要がない。
    viewModel.override(request.field, request.value, 'own', profile, null);
  }
  function clear(profile: ProfileName, field: ManifestField): void {
    viewModel.clearOverride(field, profile, null);
  }

  function toggleProfile(profile: ProfileName, on: boolean): void {
    if (on) viewModel.addProfile(profile);
    else viewModel.removeProfile(profile);
  }

  /** tags は配列だが、入力はカンマ区切りにする。JSON を書かせない。 */
  function setTags(value: string): void {
    const tags = value.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0);
    viewModel.setDefault('tags', tags.length > 0 ? tags : undefined);
  }
</script>

<Drawer
  title={schemaName}
  testid="manifest-drawer"
  dataAttributes={{ 'data-schema': schemaName }}
  {onClose}
>
  {#snippet header()}
    <span data-testid="dirty" data-dirty={viewModel.isDirty}>
      {#if viewModel.isDirty}<StatusBadge label={$t('mf_unsaved_draft')} tone="warning" />{/if}
    </span>
  {/snippet}

  <div class="mb-4">
    <SegmentedControl options={tabs} value={tab} onSelect={(value) => (tab = value as Tab)} />
  </div>

  {#if tab === 'profiles'}
    <div class="flex flex-col gap-4">
      {#each PROFILE_NAMES as profile}
        {@const value = viewModel.profileOf(profile)}
        <div data-testid="profile-row" data-profile={profile} data-present={value != null} class="rounded-lg border border-[color:var(--rvc-border)] p-3">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              data-testid="profile-toggle"
              data-profile={profile}
              class="checkbox checkbox-sm"
              checked={value != null}
              onchange={(event) => toggleProfile(profile, event.currentTarget.checked)}
            />
            <span class="font-mono text-xs font-semibold">{profile}</span>
            <span class="text-[11px] text-[color:var(--rvc-muted)]">{$t(profile === 'bff' ? 'mf_profile_bff_hint' : 'mf_profile_postgrest_hint')}</span>
          </label>

          {#if value}
            <div class="mt-3">
              <EffectiveFieldTable
                testid="profile-fields"
                data={{ 'data-profile': profile }}
                rows={viewModel.profileFields(profile)}
                onOverride={(request) => override(profile, request)}
                onClear={(field) => clear(profile, field)}
              />
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <EffectiveFieldTable
      testid="defaults-fields"
      rows={viewModel.defaultsFields('postgrest')}
      onOverride={(request) => override('postgrest', request)}
      onClear={(field) => clear('postgrest', field)}
    />
    <p class="mt-3 text-[11px] text-[color:var(--rvc-muted)]">{$t('mf_defaults_hint')}</p>
  {/if}

  {#if onOpenHelp}
    <p class="mt-4 text-[11px] text-[color:var(--rvc-muted)]">
      {$t('mf_format_help')}
      <button
        data-testid="open-help"
        data-help-page="manifest-profiles"
        class="font-semibold text-[color:var(--rvc-accent)]"
        onclick={() => onOpenHelp('manifest-profiles')}
      >{$t('mf_open_help')}</button>
    </p>
  {/if}

  {#snippet footer()}
    {#if viewModel.state.errorMessage}
      <span data-testid="save-error" class="min-w-0 flex-1 truncate text-xs rvc-value" style="color:var(--rvc-danger)">
        {viewModel.state.errorMessage}
      </span>
    {:else}
      <span class="min-w-0 flex-1 truncate text-[11px] text-[color:var(--rvc-muted)]">{$t('mf_save_hint')}</span>
    {/if}
    <button
      data-testid="revert-manifest"
      class="rounded-md border border-[color:var(--rvc-border)] px-3 py-1.5 text-xs disabled:opacity-40"
      disabled={!viewModel.isDirty}
      onclick={() => viewModel.revert()}
    >{$t('mf_revert')}</button>
    <button
      data-testid="save-manifest"
      class="rounded-md bg-[color:var(--rvc-accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
      disabled={viewModel.state.isSaving || !viewModel.isDirty}
      onclick={() => viewModel.save()}
    >{$t('mf_save')}</button>
  {/snippet}
</Drawer>
