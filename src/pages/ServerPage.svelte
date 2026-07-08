<script lang="ts">
  import { Pencil, Plus, Trash2 } from 'lucide-svelte';
  import { ServerViewModel } from '@/modules/server/viewmodels/ServerViewModel.svelte';
  import { appProvider } from '@/app/providers/AppProvider';
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import StatusBadge from '@/shared/components/StatusBadge.svelte';
  import FormRow from '@/shared/components/FormRow.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  const viewModel = new ServerViewModel(appProvider.serverService);
  // $effect で runes モードとし、viewModel の $state 更新をテンプレートが追跡できるようにする。
  $effect(() => {
    void viewModel.loadServers();
  });
</script>

<div class="mb-2 flex items-center px-1">
  <span class="text-[12px] font-semibold uppercase tracking-wide text-[color:var(--rvc-muted)]">{$t('sv_servers')} / {viewModel.servers.length}</span>
  <span class="flex-1"></span>
  <button class="flex items-center gap-1 rounded-md bg-[color:var(--rvc-accent)] px-3 py-1 text-xs font-semibold text-white" onclick={() => viewModel.startAdd()}><Plus size={13} /> {$t('sv_add')}</button>
</div>

{#if viewModel.isFormOpen}
  <SectionList title={viewModel.isEditingExisting ? $t('sv_form_edit') : $t('sv_form_add')}>
    <FormRow label={$t('f_name')}><input class="w-full bg-transparent text-left outline-none" placeholder="production" bind:value={viewModel.draft.name} /></FormRow>
    <FormRow label={$t('sv_environment')}><input class="w-full bg-transparent text-left outline-none" placeholder="dev" bind:value={viewModel.draft.environment} /></FormRow>
    <FormRow label={$t('sv_base_url')}><input class="w-full bg-transparent text-left font-mono outline-none" placeholder="https://api.example.com/v1" bind:value={viewModel.draft.baseUrl} /></FormRow>
    <FormRow label={$t('sv_description')}><input class="w-full bg-transparent text-left outline-none" bind:value={viewModel.draft.description} /></FormRow>
    <FormRow label={$t('sv_variables')}><textarea class="w-full resize-y bg-transparent text-left font-mono text-xs outline-none" rows="3" placeholder={'{ "host": { "default": "api.example.com" } }'} bind:value={viewModel.draft.variablesText}></textarea></FormRow>
    <FormRow label={$t('sv_enabled')}><input type="checkbox" bind:checked={viewModel.draft.enabled} /></FormRow>
  </SectionList>

  <SectionList title={$t('sv_connectivity')}>
    <FormRow label={$t('sv_health_path')}><input class="w-full bg-transparent text-left font-mono outline-none" placeholder="/health" bind:value={viewModel.draft.healthPath} /></FormRow>
    <FormRow label={$t('sv_expected_status')}><input type="number" class="w-full bg-transparent text-left font-mono outline-none" bind:value={viewModel.draft.expectedStatus} /></FormRow>
    <FormRow label={$t('sv_timeout_ms')}><input type="number" class="w-full bg-transparent text-left font-mono outline-none" bind:value={viewModel.draft.timeoutMs} /></FormRow>
    <FormRow label={$t('sv_base_override')}><input class="w-full bg-transparent text-left font-mono outline-none" placeholder="https://api.example.com" bind:value={viewModel.baseUrlOverride} /></FormRow>
  </SectionList>
  <p class="mb-3 px-1 text-xs text-[color:var(--rvc-muted)]">{$t('sv_connectivity_hint')}</p>

  {#if viewModel.testMessage}
    <p class="mb-3 px-1 text-xs {viewModel.testState === 'ok' ? 'text-[#12805c]' : 'text-[#e5484d]'}">{viewModel.testMessage}</p>
  {/if}
  {#if viewModel.errorMessage}
    <p class="mb-3 px-1 text-xs text-[#e5484d]">{viewModel.errorMessage}</p>
  {/if}

  <div class="mb-6 flex gap-2">
    <button class="rounded-md bg-[color:var(--rvc-accent)] px-5 py-2 font-semibold text-white disabled:opacity-50" disabled={viewModel.isBusy} onclick={() => viewModel.saveServer()}>{$t('save')}</button>
    <button class="rounded-md border border-[color:var(--rvc-border)] px-4 py-2 disabled:opacity-50" disabled={viewModel.testState === 'testing'} onclick={() => viewModel.testConnectivity()}>{viewModel.testState === 'testing' ? $t('sv_testing') : $t('sv_test')}</button>
    <button class="rounded-md border border-[color:var(--rvc-border)] px-4 py-2" onclick={() => viewModel.cancelForm()}>{$t('cancel')}</button>
  </div>
{/if}

{#if !viewModel.isFormOpen && viewModel.errorMessage}
  <p class="mb-3 px-1 text-xs text-[#e5484d]">{viewModel.errorMessage}</p>
{/if}

<SectionList title="">
  {#each viewModel.servers as server}
    <SectionListRow isButton on:click={() => viewModel.startEdit(server.id)}>
      <IconTile label="SV" color="#5b7cce" />
      <span class="min-w-0 flex-1">
        <span class="flex items-center gap-2"><span class="font-semibold">{server.name}</span><StatusBadge label={server.environment} tone="accent" />{#if !server.enabled}<StatusBadge label={$t('sv_disabled')} tone="muted" />{/if}</span>
        <span class="block font-mono text-xs text-[color:var(--rvc-muted)]">{server.baseUrl}{#if server.healthPath} · {server.healthPath}{/if}{#if server.description} · {server.description}{/if}</span>
      </span>
      <button class="rounded-md border border-[color:var(--rvc-border)] p-1.5 hover:bg-[color:var(--rvc-hover)]" title={$t('edit')} onclick={(event) => { event.stopPropagation(); viewModel.startEdit(server.id); }}><Pencil size={14} /></button>
      <button class="rounded-md border border-[color:var(--rvc-border)] p-1.5 text-[#e5484d] hover:bg-[color:var(--rvc-hover)]" title={$t('delete')} onclick={(event) => { event.stopPropagation(); viewModel.deleteServer(server.id); }}><Trash2 size={14} /></button>
    </SectionListRow>
  {/each}
</SectionList>
