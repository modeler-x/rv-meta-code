<script lang="ts">
  import { onMount } from 'svelte';
  import { Pencil, Plus, Trash2 } from 'lucide-svelte';
  import { ConnectionViewModel } from '@/modules/connection/viewmodels/ConnectionViewModel.svelte';
  import { appProvider } from '@/app/providers/AppProvider';
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import StatusBadge from '@/shared/components/StatusBadge.svelte';
  import FormRow from '@/shared/components/FormRow.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  const viewModel = new ConnectionViewModel(appProvider.connectionService);
  onMount(() => viewModel.loadConnections());
</script>

<div class="mb-2 flex items-center px-1">
  <span class="text-[12px] font-semibold uppercase tracking-wide text-[color:var(--rvc-muted)]">{$t('c_databases')} / {viewModel.connections.length}</span>
  <span class="flex-1"></span>
  <button class="flex items-center gap-1 rounded-md bg-[color:var(--rvc-accent)] px-3 py-1 text-xs font-semibold text-white" on:click={() => viewModel.startAdd()}><Plus size={13} /> {$t('c_add')}</button>
</div>

{#if viewModel.isFormOpen}
  <SectionList title={viewModel.isEditingExisting ? $t('c_form_edit') : $t('c_form_add')}>
    <FormRow label={$t('f_name')}><input class="w-full bg-transparent text-right outline-none" placeholder="Production" bind:value={viewModel.draft.name} /></FormRow>
    <FormRow label={$t('f_host')}><input class="w-full bg-transparent text-right outline-none" placeholder="db.internal" bind:value={viewModel.draft.host} /></FormRow>
    <FormRow label={$t('f_port')}><input class="w-full bg-transparent text-right outline-none" bind:value={viewModel.draft.port} /></FormRow>
    <FormRow label={$t('f_database')}><input class="w-full bg-transparent text-right outline-none" placeholder="appdb" bind:value={viewModel.draft.database} /></FormRow>
    <FormRow label={$t('f_user')}><input class="w-full bg-transparent text-right outline-none" placeholder="postgres" bind:value={viewModel.draft.user} /></FormRow>
  </SectionList>
  <div class="mb-6 flex gap-2">
    <button class="rounded-md bg-[color:var(--rvc-accent)] px-5 py-2 font-semibold text-white" on:click={() => viewModel.saveConnection()}>{$t('save')}</button>
    <button class="rounded-md border border-[color:var(--rvc-border)] px-4 py-2" on:click={() => viewModel.cancelForm()}>{$t('cancel')}</button>
  </div>
{/if}

<SectionList title="">
  {#each viewModel.connections as connection}
    <SectionListRow>
      <IconTile label="DB" color="#0090a8" />
      <span class="min-w-0 flex-1">
        <span class="flex items-center gap-2"><span class="font-semibold">{connection.name}</span>{#if connection.isCurrent}<StatusBadge label={$t('c_active')} tone="success" />{/if}</span>
        <span class="block font-mono text-xs text-[color:var(--rvc-muted)]">{connection.host}:{connection.port} / {connection.database} / {connection.user}</span>
      </span>
      {#if !connection.isCurrent}<button class="text-xs text-[color:var(--rvc-accent)]" on:click={() => viewModel.setCurrentConnection(connection.id)}>{$t('c_set_active')}</button>{/if}
      <button class="rounded-md border border-[color:var(--rvc-border)] p-1.5 hover:bg-[color:var(--rvc-hover)]" title={$t('edit')} on:click={() => viewModel.startEdit(connection.id)}><Pencil size={14} /></button>
      <button class="rounded-md border border-[color:var(--rvc-border)] p-1.5 text-[#e5484d] hover:bg-[color:var(--rvc-hover)]" title={$t('delete')} on:click={() => viewModel.deleteConnection(connection.id)}><Trash2 size={14} /></button>
    </SectionListRow>
  {/each}
</SectionList>
