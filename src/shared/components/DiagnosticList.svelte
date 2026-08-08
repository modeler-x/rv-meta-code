<script lang="ts">
  import StatusBadge from '@/shared/components/StatusBadge.svelte';
  import { functionKeyOf } from '@/modules/manifest/services/ManifestService';
  import type { ManifestDiagnostic } from '@/modules/manifest/types/Manifest';
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  // 違反は全件出す。最初の 1 件で止めないのが manifest 方式の利点なので、
  // 画面でも同じにする。severity は色だけでなく文字でも出す（色だけでは伝わらない）。
  let {
    diagnostics,
    onOpen
  }: {
    diagnostics: ManifestDiagnostic[];
    /** 該当 operation へ飛ぶ。関数キーを取れない指摘（スキーマ全体）では出さない。 */
    onOpen?: (functionKey: string) => void;
  } = $props();

  const tones = { error: 'danger', warning: 'warning', info: 'muted' } as const;
  const colors = {
    error: 'var(--rvc-danger)',
    warning: 'var(--rvc-warning)',
    info: 'var(--rvc-muted)'
  } as const;
</script>

<div class="flex flex-col divide-y divide-[color:var(--rvc-border)] overflow-hidden rounded-lg border border-[color:var(--rvc-border)]">
  {#each diagnostics as diagnostic}
    {@const functionKey = functionKeyOf(diagnostic.location)}
    <div data-testid="diagnostic" data-code={diagnostic.code} data-severity={diagnostic.severity} class="flex gap-3 px-3.5 py-3">
      <span class="w-1 shrink-0 rounded" style={`background:${colors[diagnostic.severity]}`}></span>
      <span class="min-w-0 flex-1">
        <span class="flex flex-wrap items-center gap-2">
          <span data-testid="diagnostic-severity" data-severity={diagnostic.severity}>
            <StatusBadge label={diagnostic.severity} tone={tones[diagnostic.severity]} />
          </span>
          <span class="font-mono text-[11px] font-semibold rvc-value">{diagnostic.code}</span>
        </span>
        <span class="mt-1 block truncate font-mono text-[11px] text-[color:var(--rvc-muted)] rvc-value">{diagnostic.location}</span>
        <span class="block text-xs rvc-value">{diagnostic.message}</span>
        {#if diagnostic.hint}
          <span class="block text-[11px] text-[color:var(--rvc-muted)] rvc-value">{diagnostic.hint}</span>
        {/if}
      </span>
      {#if functionKey && onOpen}
        <button
          data-testid="diagnostic-jump"
          data-code={diagnostic.code}
          data-operation={functionKey}
          class="shrink-0 self-start text-xs font-semibold text-[color:var(--rvc-accent)]"
          onclick={() => onOpen(functionKey)}
        >{$t('mf_jump')}</button>
      {/if}
    </div>
  {/each}
  {#if diagnostics.length === 0}
    <div class="px-4 py-6 text-sm text-[color:var(--rvc-muted)]">{$t('mf_no_diagnostics')}</div>
  {/if}
</div>
