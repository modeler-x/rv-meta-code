<script module lang="ts">
  /**
   * 「確認 → 実行中 → 結果 → 次へ」を出すシート。
   *
   * 押しても何も起きないように見える操作を作らないために置く。実行前に何が変わるかを
   * 示し、変化が無いならそう言い、終わったら次の工程へ渡す。
   */
  export type TaskState = 'idle' | 'confirm' | 'running' | 'done' | 'error';

  export type TaskSheetProps = {
    state: TaskState;
    title: string;
    /** 確認時に「何が起きるか」を 1 行ずつ。空なら変化が無いということ。 */
    plan: string[];
    /** 実行後の結果を 1 行ずつ。 */
    result: string[];
    /** 変化が無い場合に出す一言。 */
    emptyNotice?: string;
    progress: number;
    errorMessage?: string;
    onCancel: () => void;
    onRun: () => void;
    onClose: () => void;
    /** 次の工程へ渡す導線。省略すると出ない。 */
    next?: { label: string; onNext: () => void };
  };
</script>

<script lang="ts">
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  let {
    state,
    title,
    plan,
    result,
    emptyNotice = '',
    progress,
    errorMessage = '',
    onCancel,
    onRun,
    onClose,
    next
  }: TaskSheetProps = $props();
</script>

{#if state !== 'idle'}
  <div data-testid="task-sheet" data-state={state} class="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
    <div class="w-[min(460px,100%)] rounded-xl border border-[color:var(--rvc-border)] bg-[color:var(--rvc-panel)] p-5 shadow-2xl">
      <h2 class="mb-2 text-sm font-bold">{title}</h2>

      {#if state === 'confirm'}
        <ul class="mb-3 flex flex-col gap-1 pl-4 text-xs" style="list-style:disc">
          {#each plan as line}<li data-testid="task-plan" class="rvc-value">{line}</li>{/each}
        </ul>
        {#if plan.length === 0 && emptyNotice}
          <p data-testid="task-empty" class="mb-3 text-xs" style="color:var(--rvc-warning)">{emptyNotice}</p>
        {/if}
        <div class="flex justify-end gap-2">
          <button class="rounded-md border border-[color:var(--rvc-border)] px-4 py-1.5 text-xs" onclick={onCancel}>{$t('cancel')}</button>
          <button
            data-testid="task-run"
            class="rounded-md bg-[color:var(--rvc-accent)] px-4 py-1.5 text-xs font-semibold text-white"
            onclick={onRun}
          >{$t('gen_run')}</button>
        </div>

      {:else if state === 'running'}
        <div class="mb-2 h-1.5 overflow-hidden rounded bg-[color:var(--rvc-search)]">
          <div class="h-full rounded bg-[color:var(--rvc-accent)] transition-[width] duration-300" style={`width:${progress}%`}></div>
        </div>
        <p class="text-right text-xs tabular-nums text-[color:var(--rvc-muted)]">{progress}%</p>

      {:else if state === 'error'}
        <p data-testid="task-error" class="mb-3 text-xs rvc-value" style="color:var(--rvc-danger)">{errorMessage}</p>
        <div class="flex justify-end">
          <button class="rounded-md border border-[color:var(--rvc-border)] px-4 py-1.5 text-xs" onclick={onClose}>{$t('close')}</button>
        </div>

      {:else}
        <div class="mb-3 flex flex-col gap-1 rounded-lg bg-[color:var(--rvc-search)] p-3 text-xs">
          {#each result as line}<span data-testid="task-result" class="rvc-value">{line}</span>{/each}
          {#if result.length === 0}
            <span data-testid="task-result" class="text-[color:var(--rvc-muted)]">{emptyNotice}</span>
          {/if}
        </div>
        <div class="flex justify-end gap-2">
          <button class="rounded-md border border-[color:var(--rvc-border)] px-4 py-1.5 text-xs" onclick={onClose}>{$t('close')}</button>
          {#if next}
            <button
              data-testid="task-next"
              class="rounded-md bg-[color:var(--rvc-accent)] px-4 py-1.5 text-xs font-semibold text-white"
              onclick={next.onNext}
            >{next.label}</button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
