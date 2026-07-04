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
  const ERROR_CODE = 'EMPTY_SCHEMA';
  $: stepText = $genSteps[Math.max(0, Math.min(step - 1, $genSteps.length - 1))];
  $: confirmMessage = $t('gen_confirm_msg').replace('{schema}', schemaName);
  $: errorDetail = $t('gen_err_detail').replace('{schema}', schemaName);
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
        <div class="flex items-center justify-between text-xs text-[color:var(--rvc-muted)]"><span>{stepText}</span><span class="tabular-nums">{progress}%</span></div>
      {:else if state === 'done'}
        <h2 class="mb-2 text-base font-bold">{$t('gen_done_title')}</h2>
        <p class="mb-5 text-[color:var(--rvc-muted)]">{detail}</p>
        <div class="flex justify-center gap-2"><button class="rounded-md border border-[color:var(--rvc-border)] px-5 py-2" on:click={onCancel}>{$t('close')}</button><button class="rounded-md bg-[color:var(--rvc-accent)] px-5 py-2 font-semibold text-white" on:click={onOpenDocument}>{$t('gen_view_doc')}</button></div>
      {:else}
        <h2 class="mb-2 text-base font-bold text-red-500">{$t('gen_err_title')}</h2>
        <p class="mb-2 text-xs text-[color:var(--rvc-muted)]">{errorDetail}</p>
        <p class="mb-5 inline-block rounded bg-red-500/10 px-2 py-1 font-mono text-[11px] text-red-500">{ERROR_CODE}</p>
        <div><button class="rounded-md bg-[color:var(--rvc-accent)] px-5 py-2 font-semibold text-white" on:click={onCancel}>{$t('close')}</button></div>
      {/if}
    </div>
  </div>
{/if}
