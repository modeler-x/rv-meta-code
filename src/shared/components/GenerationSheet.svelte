<script lang="ts">
  import type { GenerationState } from '@/modules/generation/types/GenerationState';
  import { translate as t, genSteps } from '@/shared/i18n/i18n.svelte';
  export let state: GenerationState;
  export let schemaName = '';
  export let progress = 0;
  export let step = 1;
  export let detail = '';
  export let onCancel: () => void;
  export let onRun: () => void;
  export let onOpenDocument: () => void;
  export let errorMessage = '';
  export let errorHint = '';
  export let routeConflicts: {
    method: string;
    path: string;
    functionName: string;
    entityTable: string;
  }[] = [];
  export let totalCount = 1;
  export let doneCount = 0;
  $: stepText = $genSteps[Math.max(0, Math.min(step - 1, $genSteps.length - 1))];
  $: confirmMessage =
    totalCount > 1
      ? $t('gen_confirm_msg_many').replace('{n}', String(totalCount))
      : $t('gen_confirm_msg').replace('{schema}', schemaName);
  $: progressLabel =
    totalCount > 1
      ? $t('gen_progress').replace('{done}', String(doneCount)).replace('{total}', String(totalCount))
      : stepText;
</script>

{#if state !== 'idle'}
  <div class="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
    <div class="w-96 max-w-full rounded-xl border border-[color:var(--rvc-border)] bg-[color:var(--rvc-panel)] p-6 text-center shadow-2xl">
      {#if state === 'confirm'}
        <h2 class="mb-2 text-base font-bold">{$t('gen_confirm_title')}</h2>
        <p class="mb-5 text-[color:var(--rvc-muted)]">{confirmMessage}</p>
        <div class="flex justify-center gap-2"><button class="rounded-md border border-[color:var(--rvc-border)] px-5 py-2" on:click={onCancel}>{$t('cancel')}</button><button class="rounded-md bg-[color:var(--rvc-accent)] px-5 py-2 font-semibold text-white" on:click={onRun}>{$t('gen_run')}</button></div>
      {:else if state === 'running'}
        <div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-[3px] border-[color:var(--rvc-search)] border-t-[color:var(--rvc-accent)]"></div>
        <h2 class="mb-1 text-base font-bold">{$t('gen_running_title')}</h2>
        <p class="mb-4 font-mono text-xs text-[color:var(--rvc-muted)]">{schemaName}</p>
        <div class="mb-2 h-1.5 overflow-hidden rounded bg-[color:var(--rvc-search)]"><div class="h-full rounded bg-[color:var(--rvc-accent)] transition-[width] duration-300" style={`width:${progress}%`}></div></div>
        <div class="flex items-center justify-between text-xs text-[color:var(--rvc-muted)]"><span>{progressLabel}</span><span class="tabular-nums">{progress}%</span></div>
      {:else if state === 'done'}
        <h2 class="mb-2 text-base font-bold">{$t('gen_done_title')}</h2>
        <p class="mb-5 text-[color:var(--rvc-muted)]">{detail}</p>
        <div class="flex justify-center gap-2"><button class="rounded-md border border-[color:var(--rvc-border)] px-5 py-2" on:click={onCancel}>{$t('close')}</button><button class="rounded-md bg-[color:var(--rvc-accent)] px-5 py-2 font-semibold text-white" on:click={onOpenDocument}>{$t('gen_view_doc')}</button></div>
      {:else}
        <h2 class="mb-2 text-base font-bold text-red-500">{$t('gen_err_title')}</h2>
        <p class="mb-3 block whitespace-pre-wrap rounded bg-red-500/10 px-2 py-1 text-left font-mono text-[11px] text-red-500">{errorMessage}</p>
        {#if errorHint}
          <div class="mb-3 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-left text-[11px] text-[color:var(--rvc-fg)]">
            <span class="font-semibold text-amber-600">{$t('gen_err_hint')}:</span>
            <span class="whitespace-pre-wrap">{errorHint}</span>
          </div>
        {/if}
        {#if routeConflicts.length > 0}
          <div class="mb-4 text-left">
            <p class="mb-1 text-[11px] font-semibold text-[color:var(--rvc-muted)]">{$t('gen_err_conflicts')}</p>
            <ul class="max-h-40 overflow-auto rounded border border-[color:var(--rvc-border)] bg-[color:var(--rvc-search)]">
              {#each routeConflicts as c}
                <li class="border-b border-[color:var(--rvc-border)] px-2 py-1 font-mono text-[10px] last:border-b-0">
                  <span class="font-semibold text-red-500">{c.method} {c.path}</span>
                  <span class="text-[color:var(--rvc-muted)]"> — {c.functionName} × {c.entityTable}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
        <div><button class="rounded-md bg-[color:var(--rvc-accent)] px-5 py-2 font-semibold text-white" on:click={onCancel}>{$t('close')}</button></div>
      {/if}
    </div>
  </div>
{/if}
