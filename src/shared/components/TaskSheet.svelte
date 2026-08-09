<script module lang="ts">
  /**
   * 「確認 → 実行中 → 結果 → 次へ」を出すシート。
   *
   * 押しても何も起きないように見える操作を作らないために置く。実行前に何が変わるかを
   * 示し、変化が無いならそう言い、終わったら次の工程へ渡す。
   */
  export type TaskState = 'idle' | 'confirm' | 'running' | 'done' | 'error';

  export type TaskSheetProps = {
    /** 進行の段階。prop 名を state にすると $state ルーンと衝突するので phase とする。 */
    phase: TaskState;
    title: string;
    /** 確認時に「何が起きるか」を 1 行ずつ。空なら変化が無いということ。 */
    plan: string[];
    /** 実行対象。進捗に「いまどれを処理しているか」を出すために要る。 */
    targets?: string[];
    /** 完了した件数。 */
    done?: number;
    /** 実行を始めた時刻（ミリ秒）。経過を出して、止まっていないことを示す。 */
    startedAt?: number | null;
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
    phase,
    title,
    plan,
    result,
    emptyNotice = '',
    progress,
    targets = [],
    done = 0,
    startedAt = null,
    errorMessage = '',
    onCancel,
    onRun,
    onClose,
    next
  }: TaskSheetProps = $props();

  const current = $derived(targets[Math.min(done, Math.max(targets.length - 1, 0))] ?? '');

  // 経過は 1 秒ごとに進める。数字が動いていること自体が「生きている」合図になる。
  let now = $state(Date.now());
  $effect(() => {
    if (phase !== 'running') return;
    const timer = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(timer);
  });
  const elapsed = $derived(startedAt ? Math.floor((now - startedAt) / 1000) : 0);
</script>

{#if phase !== 'idle'}
  <div data-testid="task-sheet" data-state={phase} class="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
    <div class="w-[min(460px,100%)] rounded-xl border border-[color:var(--rvc-border)] bg-[color:var(--rvc-panel)] p-5 shadow-2xl">
      <h2 class="mb-2 text-sm font-bold">{title}</h2>

      {#if phase === 'confirm'}
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

      {:else if phase === 'running'}
        <div class="mb-2 h-1.5 overflow-hidden rounded bg-[color:var(--rvc-search)]">
          <div class="h-full rounded bg-[color:var(--rvc-accent)] transition-[width] duration-300" style={`width:${progress}%`}></div>
        </div>
        <!--
          規模の大きいスキーマでは 1 件に時間がかかる。何も動かない画面は
          「障害で止まった」と読まれるので、対象名・件数・経過を出し続ける。
        -->
        <div data-testid="task-progress" data-done={done} data-total={targets.length} class="flex flex-col gap-1 text-xs">
          <span class="font-mono rvc-value">{current}</span>
          <span class="tabular-nums text-[color:var(--rvc-muted)]">
            {$t('task_progress').replace('{done}', String(done)).replace('{total}', String(targets.length)).replace('{sec}', String(elapsed))}
          </span>
          {#if elapsed >= 3}
            <span data-testid="task-slow" class="text-[11px]" style="color:var(--rvc-warning)">{$t('task_slow')}</span>
          {/if}
        </div>
        <div class="mt-2 flex flex-col gap-0.5">
          {#each targets as target, index}
            <span
              data-testid="task-target"
              data-state={index < done ? 'done' : index === done ? 'current' : 'todo'}
              class="font-mono text-[11px]"
              style={index < done
                ? 'color:var(--rvc-success)'
                : index === done
                  ? ''
                  : 'color:var(--rvc-muted)'}
            >{index < done ? '✓' : index === done ? '▶' : '·'} {target}</span>
          {/each}
        </div>
        <div class="mt-3 flex justify-end">
          <button data-testid="task-cancel" class="rounded-md border border-[color:var(--rvc-border)] px-4 py-1.5 text-xs" onclick={onCancel}>
            {$t('task_cancel')}
          </button>
        </div>

      {:else if phase === 'error'}
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
