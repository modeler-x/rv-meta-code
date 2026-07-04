<script lang="ts">
  import { onMount } from 'svelte';
  import { ProfileViewModel } from '@/modules/profile/viewmodels/ProfileViewModel.svelte';
  import { PreferencesViewModel } from '@/modules/preferences/viewmodels/PreferencesViewModel.svelte';
  import { appProvider } from '@/app/providers/AppProvider';
  import FormRow from '@/shared/components/FormRow.svelte';
  import SectionList from '@/shared/components/SectionList.svelte';
  import SegmentedControl from '@/shared/components/SegmentedControl.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  import type { LanguageCode } from '@/shared/i18n/messages';
  import type { ProfileRole } from '@/modules/profile/types/Profile';
  const viewModel = new ProfileViewModel(appProvider.profileService);
  const preferencesViewModel = new PreferencesViewModel(appProvider.preferencesService);
  onMount(() => preferencesViewModel.loadPreferences());
  const roleLabelKeys = { Developer: 'role_developer', DBA: 'role_dba', Admin: 'role_admin' } as const;
  $: roleOptions = [
    { label: $t('role_developer'), value: 'Developer' },
    { label: $t('role_dba'), value: 'DBA' },
    { label: $t('role_admin'), value: 'Admin' }
  ];
</script>

<SectionList title={$t('preferences')}>
  <FormRow label={$t('language')}>
    <div class="flex justify-end">
      <select class="rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-panel)] px-2 py-1 text-sm outline-none" value={preferencesViewModel.preferences.language} on:change={(event) => preferencesViewModel.setLanguage(event.currentTarget.value as LanguageCode)}>
        <option value="en">English</option>
        <option value="ja">日本語</option>
      </select>
    </div>
  </FormRow>
</SectionList>

{#if !viewModel.profile && !viewModel.isEditing}
  <div class="py-8 text-center">
    <h2 class="mb-2 text-lg font-semibold">{$t('p_empty_title')}</h2>
    <p class="mb-5 text-sm text-[color:var(--rvc-muted)]">{$t('p_empty_desc')}</p>
    <button class="rounded-md bg-[color:var(--rvc-accent)] px-5 py-2 font-semibold text-white" on:click={() => viewModel.startEditing()}>{$t('p_create')}</button>
  </div>
{:else if viewModel.isEditing}
  <SectionList title={viewModel.profile ? $t('p_edit_title') : $t('p_create_title')}>
    <FormRow label={$t('f_fullname')}><input class="w-full bg-transparent text-right outline-none" placeholder="Jane Doe" bind:value={viewModel.draft.fullName} /></FormRow>
    <FormRow label={$t('f_email')}><input class="w-full bg-transparent text-right outline-none" placeholder="jane@company.com" bind:value={viewModel.draft.email} /></FormRow>
    <FormRow label={$t('f_org')}><input class="w-full bg-transparent text-right outline-none" bind:value={viewModel.draft.organization} /></FormRow>
    <FormRow label={$t('f_role')}><SegmentedControl options={roleOptions} value={viewModel.draft.role} onSelect={(value) => viewModel.setRole(value as ProfileRole)} /></FormRow>
  </SectionList>
  <div class="flex gap-2">
    <button class="rounded-md bg-[color:var(--rvc-accent)] px-5 py-2 font-semibold text-white" on:click={() => viewModel.saveProfile()}>{$t('save')}</button>
    <button class="rounded-md border border-[color:var(--rvc-border)] px-4 py-2" on:click={() => viewModel.cancelEditing()}>{$t('cancel')}</button>
  </div>
{:else if viewModel.profile}
  <div class="mb-5 flex items-center gap-4">
    <span class="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--rvc-accent)] text-xl font-bold text-white">{viewModel.profile.fullName.trim().charAt(0).toUpperCase() || '?'}</span>
    <div><div class="text-xl font-bold">{viewModel.profile.fullName}</div><div class="text-sm text-[color:var(--rvc-muted)]">{viewModel.profile.email}</div></div>
  </div>
  <SectionList title="">
    <FormRow label={$t('p_role')}>{$t(roleLabelKeys[viewModel.profile.role])}</FormRow>
    <FormRow label={$t('p_org')}>{viewModel.profile.organization}</FormRow>
    <FormRow label={$t('p_email')}>{viewModel.profile.email}</FormRow>
    <FormRow label={$t('p_status')}><span class="flex items-center justify-end gap-2"><span class="h-2 w-2 rounded-full bg-[#28c840]"></span>{$t('status_registered')}</span></FormRow>
  </SectionList>
  <button class="rounded-md border border-[color:var(--rvc-border)] px-4 py-2" on:click={() => viewModel.startEditing()}>{$t('btn_edit_profile')}</button>
{/if}
