<script lang="ts">
  import { Pencil, Plus, Trash2, X } from 'lucide-svelte';
  import { ConnectionViewModel } from '@/modules/connection/viewmodels/ConnectionViewModel.svelte';
  import { appProvider } from '@/app/providers/AppProvider';
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import StatusBadge from '@/shared/components/StatusBadge.svelte';
  import FormRow from '@/shared/components/FormRow.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  const viewModel = new ConnectionViewModel(appProvider.connectionService);
  // $effect で runes モードとし、viewModel の $state 更新をテンプレートが追跡できるようにする。
  $effect(() => {
    void viewModel.loadConnections();
  });
</script>

<div class="mb-2 flex items-center px-1">
  <span class="text-[12px] font-semibold uppercase tracking-wide text-[color:var(--rvc-muted)]">{$t('c_databases')} / {viewModel.connections.length}</span>
  <span class="flex-1"></span>
  <button class="flex items-center gap-1 rounded-md bg-[color:var(--rvc-accent)] px-3 py-1 text-xs font-semibold text-white" onclick={() => viewModel.startAdd()}><Plus size={13} /> {$t('c_add')}</button>
</div>

{#if viewModel.isFormOpen}
  <SectionList title={viewModel.isEditingExisting ? $t('c_form_edit') : $t('c_form_add')}>
    <FormRow label={$t('f_name')}><input class="w-full bg-transparent text-left outline-none" placeholder="Production" bind:value={viewModel.draft.name} /></FormRow>
    <FormRow label={$t('f_host')}><input class="w-full bg-transparent text-left outline-none" placeholder="db.internal" bind:value={viewModel.draft.host} /></FormRow>
    <FormRow label={$t('f_port')}><input class="w-full bg-transparent text-left outline-none" bind:value={viewModel.draft.port} /></FormRow>
    <FormRow label={$t('f_database')}><input class="w-full bg-transparent text-left outline-none" placeholder="appdb" bind:value={viewModel.draft.database} /></FormRow>
    <FormRow label={$t('f_user')}><input class="w-full bg-transparent text-left outline-none" placeholder="postgres" bind:value={viewModel.draft.user} /></FormRow>
    <FormRow label={$t('f_password')}><input type="password" class="w-full bg-transparent text-left outline-none" placeholder={viewModel.draft.hasPassword ? $t('c_password_keep') : '••••••••'} bind:value={viewModel.draft.password} /></FormRow>
    <FormRow label={$t('f_excluded_schemas')}>
      <div class="flex flex-col gap-2">
        {#if viewModel.draft.excludedSchemas.length > 0}
          <div class="flex flex-wrap gap-1.5">
            {#each viewModel.draft.excludedSchemas as schema}
              <span class="flex items-center gap-1 rounded-md bg-[color:var(--rvc-search)] px-2 py-0.5 font-mono text-xs">
                {schema}
                <button type="button" class="text-[color:var(--rvc-muted)] hover:text-[#e5484d]" title={$t('delete')} onclick={() => viewModel.removeExcludedSchema(schema)}><X size={12} /></button>
              </span>
            {/each}
          </div>
        {/if}
        <div class="flex items-center gap-2">
          <input class="min-w-0 flex-1 bg-transparent text-left font-mono outline-none" placeholder={$t('c_excluded_placeholder')} bind:value={viewModel.schemaInput} onkeydown={(event) => { if (event.key === 'Enter') { event.preventDefault(); viewModel.addExcludedSchema(); } }} />
          <button type="button" class="shrink-0 rounded-md border border-[color:var(--rvc-border)] px-2.5 py-1 text-xs hover:bg-[color:var(--rvc-hover)]" onclick={() => viewModel.addExcludedSchema()}>{$t('c_excluded_add')}</button>
        </div>
      </div>
    </FormRow>
  </SectionList>
  <p class="mb-3 px-1 text-xs text-[color:var(--rvc-muted)]">{$t('c_secret_hint')}</p>

  {#if viewModel.testMessage}
    <p class="mb-3 px-1 text-xs {viewModel.testState === 'ok' ? 'text-[#12805c]' : 'text-[#e5484d]'}">{viewModel.testMessage}</p>
  {/if}
  {#if viewModel.errorMessage}
    <p class="mb-3 px-1 text-xs text-[#e5484d]">{viewModel.errorMessage}</p>
  {/if}

  <div class="mb-6 flex gap-2">
    <button class="rounded-md bg-[color:var(--rvc-accent)] px-5 py-2 font-semibold text-white disabled:opacity-50" disabled={viewModel.isBusy} onclick={() => viewModel.saveConnection()}>{$t('save')}</button>
    <button class="rounded-md border border-[color:var(--rvc-border)] px-4 py-2 disabled:opacity-50" disabled={viewModel.testState === 'testing'} onclick={() => viewModel.testConnection()}>{viewModel.testState === 'testing' ? $t('c_testing') : $t('c_test')}</button>
    <button class="rounded-md border border-[color:var(--rvc-border)] px-4 py-2" onclick={() => viewModel.cancelForm()}>{$t('cancel')}</button>
  </div>
{/if}

{#if !viewModel.isFormOpen && viewModel.errorMessage}
  <p class="mb-3 px-1 text-xs text-[#e5484d]">{viewModel.errorMessage}</p>
{/if}

<SectionList title="">
  {#each viewModel.connections as connection}
    <SectionListRow isButton on:click={() => viewModel.startEdit(connection.id)}>
      <IconTile label="DB" color="#0090a8" />
      <span class="min-w-0 flex-1">
        <span class="flex items-center gap-2"><span class="font-semibold">{connection.name}</span>{#if connection.isCurrent}<StatusBadge label={$t('c_active')} tone="success" />{/if}</span>
        <span class="block font-mono text-xs text-[color:var(--rvc-muted)]">{connection.host}:{connection.port} / {connection.database} / {connection.user}</span>
      </span>
      {#if !connection.isCurrent}<button class="text-xs text-[color:var(--rvc-accent)]" onclick={(event) => { event.stopPropagation(); viewModel.setCurrentConnection(connection.id); }}>{$t('c_set_active')}</button>{/if}
      <button class="rounded-md border border-[color:var(--rvc-border)] p-1.5 hover:bg-[color:var(--rvc-hover)]" title={$t('edit')} onclick={(event) => { event.stopPropagation(); viewModel.startEdit(connection.id); }}><Pencil size={14} /></button>
      <button class="rounded-md border border-[color:var(--rvc-border)] p-1.5 text-[#e5484d] hover:bg-[color:var(--rvc-hover)]" title={$t('delete')} onclick={(event) => { event.stopPropagation(); viewModel.deleteConnection(connection.id); }}><Trash2 size={14} /></button>
    </SectionListRow>
  {/each}
</SectionList>
