<script module lang="ts">
  /**
   * 成果物の連なりの、いまどこにいるか。
   *
   * 工程を跨ぐ操作（作る → 生成する → SDK を出す）が続くので、
   * 現在地と次に何ができるかが分かる帯を各ページの先頭に置く。
   */
  export const STAGES = [
    { route: 'schema', step: '1', key: 'nav_schemas' },
    { route: 'manifest', step: '2', key: 'nav_manifest' },
    { route: 'documents', step: '3', key: 'nav_documents' },
    { route: 'sdkList', step: '4', key: 'nav_sdk' }
  ] as const;

  export type StageRoute = (typeof STAGES)[number]['route'];
</script>

<script lang="ts">
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  let { current }: { current: StageRoute } = $props();
  const index = $derived(STAGES.findIndex((stage) => stage.route === current));
</script>

<div data-testid="stage-rail" data-current={current} class="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] text-[color:var(--rvc-muted)]">
  {#each STAGES as stage, i}
    {#if i > 0}<span class="opacity-40">→</span>{/if}
    <span
      data-testid="stage"
      data-stage={stage.route}
      data-state={i === index ? 'current' : i < index ? 'done' : 'todo'}
      class="rounded-full px-2.5 py-0.5"
      style={i === index
        ? 'background:color-mix(in srgb, var(--rvc-accent) 14%, transparent);color:var(--rvc-accent);font-weight:650'
        : i < index
          ? 'background:var(--rvc-search);color:var(--rvc-success)'
          : 'background:var(--rvc-search)'}
    >{stage.step} {$t(stage.key)}</span>
  {/each}
</div>
