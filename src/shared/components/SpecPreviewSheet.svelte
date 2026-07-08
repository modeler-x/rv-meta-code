<script lang="ts">
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  import type { OpenApiSpec } from '@/modules/document/types/OpenApiSpec';

  // 選択ドキュメントの OpenAPI 仕様をプレビューし、クリップボードへコピーする。
  // 単一選択ならその仕様、複数選択なら schema 名をキーにしたマップを表示/コピーする。
  export let specs: OpenApiSpec[] = [];
  export let onClose: () => void;

  let copied = false;

  // specs を $: 行で直接参照して依存追跡させる（関数内参照だと再計算されない）。
  $: pretty = JSON.stringify(
    specs.length === 1
      ? specs[0].spec
      : Object.fromEntries(specs.map((item) => [item.schemaName, item.spec])),
    null,
    2
  );

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(pretty);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      copied = false;
    }
  }
</script>

{#if specs.length > 0}
  <div class="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
    <div class="flex max-h-[80vh] w-[720px] max-w-full flex-col rounded-xl border border-[color:var(--rvc-border)] bg-[color:var(--rvc-panel)] shadow-2xl">
      <div class="flex items-center justify-between border-b border-[color:var(--rvc-border)] px-5 py-3">
        <div>
          <h2 class="text-base font-bold">{$t('spec_preview_title')}</h2>
          <p class="text-xs text-[color:var(--rvc-muted)]">{specs.map((item) => item.schemaName).join(', ')}</p>
        </div>
        <div class="flex items-center gap-2">
          <button class="rounded-md bg-[color:var(--rvc-accent)] px-4 py-1.5 text-sm font-semibold text-white" on:click={copy}>
            {copied ? $t('spec_copied') : $t('spec_copy')}
          </button>
          <button class="rounded-md border border-[color:var(--rvc-border)] px-4 py-1.5 text-sm" on:click={onClose}>{$t('close')}</button>
        </div>
      </div>
      <pre class="flex-1 overflow-auto whitespace-pre px-5 py-4 font-mono text-[11px] leading-5 text-[color:var(--rvc-text)]">{pretty}</pre>
    </div>
  </div>
{/if}
