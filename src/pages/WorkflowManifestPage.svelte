<script lang="ts">
  import { Check, ChevronRight, Code2, FileJson2, FolderOpen, Plus, RefreshCw, Search, Trash2, WandSparkles } from 'lucide-svelte';
  import type { WorkflowManifestViewModel } from '@/modules/workflow-manifest/viewmodels/WorkflowManifestViewModel.svelte';
  import FieldDefinitionEditor from '@/modules/workflow-manifest/components/FieldDefinitionEditor.svelte';
  import ArtifactDefinitionEditor from '@/modules/workflow-manifest/components/ArtifactDefinitionEditor.svelte';

  let { viewModel }: { viewModel: WorkflowManifestViewModel } = $props();
  type Stage = 'component' | 'workflow' | 'inputs' | 'steps' | 'results' | 'review';
  let stage: Stage = $state('component');
  const stages: { key: Stage; label: string; detail: string }[] = [
    { key: 'component', label: 'コンポーネント', detail: '対象を選ぶ' },
    { key: 'workflow', label: 'ワークフロー', detail: '役割を説明する' },
    { key: 'inputs', label: '入力', detail: '設定と実行要求' },
    { key: 'steps', label: '業務工程', detail: '処理を人向けに翻訳' },
    { key: 'results', label: '結果', detail: '出力と権限' },
    { key: 'review', label: '確認・保存', detail: '契約を検証する' }
  ];

  const inputClass = 'mt-1 w-full rounded-md border border-[color:var(--rvc-border)] bg-white px-3 py-2 text-sm';
  const readonlyClass = `${inputClass} bg-[color:var(--rvc-search)] font-mono text-xs text-[color:var(--rvc-muted)]`;
  const selectedWorkflow = $derived(viewModel.selectedWorkflow);
  const selectedStep = $derived(viewModel.selectedStep);

  function splitList(value: string): string[] {
    return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
  }
</script>

<div class="mb-6 flex items-start gap-3">
  <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--rvc-accent)] text-white"><WandSparkles size={20} /></span>
  <div class="min-w-0 flex-1">
    <h2 class="text-xl font-bold">Workflow Manifest</h2>
    <p class="mt-1 text-xs leading-5 text-[color:var(--rvc-muted)]">Temporal Workflowコードから構造のフレームを取り出し、開発者が業務上の表示名・説明・入出力を補完します。実行制御は変更しません。</p>
  </div>
  <button class="flex shrink-0 items-center gap-2 rounded-md border border-[color:var(--rvc-border)] bg-white px-3 py-2 text-xs font-semibold" onclick={() => viewModel.chooseWorkspace()} disabled={viewModel.isScanning}>
    <FolderOpen size={15} />Workerを選択
  </button>
</div>

<div class="mb-4 flex items-center gap-2 rounded-lg border border-[color:var(--rvc-border)] bg-[color:var(--rvc-panel)] px-3 py-2">
  <Code2 size={15} class="shrink-0 text-[color:var(--rvc-muted)]" />
  <span class="min-w-0 flex-1 truncate font-mono text-[11px] text-[color:var(--rvc-muted)]">{viewModel.workspace || 'Workerのソースフォルダーを選択してください'}</span>
  {#if viewModel.workspace}<button class="rounded p-1 hover:bg-[color:var(--rvc-hover)]" aria-label="再検索" onclick={() => viewModel.scan()}><RefreshCw size={14} class={viewModel.isScanning ? 'animate-spin' : ''} /></button>{/if}
</div>

{#if viewModel.errorMessage}<p class="mb-4 rounded-lg border border-[color:#e5484d] bg-[color:#fff5f5] px-3 py-2 text-xs text-[color:#e5484d]">{viewModel.errorMessage}</p>{/if}

{#if !viewModel.selectedCandidate}
  <section class="rounded-xl border border-[color:var(--rvc-border)] bg-[color:var(--rvc-panel)] p-4">
    <div class="mb-3 flex items-center gap-2"><FileJson2 size={17} /><h3 class="text-sm font-semibold">コンポーネントを選ぶ</h3></div>
    <p class="mb-4 text-xs leading-5 text-[color:var(--rvc-muted)]">`rv:workflow-frame` 宣言または既存の `workflow_manifest.json` がある場所を検索します。既存Manifestがある場合は、人が記述した内容を保ったままコード構造を更新します。</p>
    {#if viewModel.workspace}
      <label class="relative mb-3 block"><Search size={14} class="absolute left-3 top-2.5 text-[color:var(--rvc-muted)]" /><input class="w-full rounded-md border border-[color:var(--rvc-border)] bg-white py-2 pl-9 pr-3 text-sm" placeholder="コンポーネント、Workflow、パスを検索" bind:value={viewModel.query} /></label>
      <div class="space-y-2">
        {#each viewModel.filteredCandidates as candidate}
          <button class="group flex w-full items-center gap-3 rounded-lg border border-[color:var(--rvc-border)] bg-white p-3 text-left transition hover:-translate-y-px hover:border-[color:var(--rvc-accent)] hover:shadow-sm" onclick={() => { viewModel.selectCandidate(candidate); stage = 'component'; }}>
            <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--rvc-search)] text-[color:var(--rvc-accent)]"><FileJson2 size={18} /></span>
            <span class="min-w-0 flex-1"><strong class="block truncate text-sm">{candidate.componentCode || candidate.directory.split('/').slice(-1)[0]}</strong><span class="block truncate font-mono text-[10px] text-[color:var(--rvc-muted)]">{candidate.directory}</span></span>
            <span class="text-right text-[10px] text-[color:var(--rvc-muted)]">{candidate.workflows.length} Workflow<br />{candidate.manifestPath ? '既存Manifestあり' : '新規作成'}</span>
            <ChevronRight size={16} class="transition group-hover:translate-x-0.5" />
          </button>
        {/each}
        {#if !viewModel.isScanning && viewModel.filteredCandidates.length === 0}<p class="rounded-lg border border-dashed border-[color:var(--rvc-border)] p-6 text-center text-xs text-[color:var(--rvc-muted)]">対象のコンポーネントは見つかりませんでした。</p>{/if}
      </div>
    {:else}
      <button class="flex w-full flex-col items-center rounded-lg border border-dashed border-[color:var(--rvc-border)] px-4 py-10 text-[color:var(--rvc-muted)] hover:border-[color:var(--rvc-accent)]" onclick={() => viewModel.chooseWorkspace()}><FolderOpen size={28} /><span class="mt-2 text-sm font-semibold">Workerのソースフォルダーを開く</span></button>
    {/if}
  </section>
{:else if viewModel.draft}
  <div class="grid grid-cols-[190px_minmax(0,1fr)] gap-5">
    <aside class="space-y-1">
      <button class="mb-3 text-xs text-[color:var(--rvc-accent)]" onclick={() => { viewModel.selectedCandidate = null; viewModel.draft = null; }}>← コンポーネント一覧</button>
      {#each stages as item, index}
        <button class={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left ${stage === item.key ? 'bg-[color:var(--rvc-accent)] text-white' : 'hover:bg-[color:var(--rvc-hover)]'}`} onclick={() => stage = item.key}>
          <span class={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${stage === item.key ? 'border-white/60' : 'border-[color:var(--rvc-border)]'}`}>{index + 1}</span>
          <span><strong class="block text-xs">{item.label}</strong><span class={`block text-[9px] ${stage === item.key ? 'text-white/70' : 'text-[color:var(--rvc-muted)]'}`}>{item.detail}</span></span>
        </button>
      {/each}
    </aside>

    <section class="min-w-0 rounded-xl border border-[color:var(--rvc-border)] bg-[color:var(--rvc-panel)] p-5">
      {#if stage === 'component'}
        <h3 class="text-base font-semibold">コンポーネント</h3>
        <p class="mt-1 text-xs text-[color:var(--rvc-muted)]">Workerが公開する機能群の識別子です。既存Manifestまたはフォルダー名から初期値を設定しています。</p>
        <label class="mt-5 block text-xs text-[color:var(--rvc-muted)]">Component code<input class={inputClass} value={viewModel.draft.component} oninput={(event) => viewModel.updateComponentCode(event.currentTarget.value)} /></label>
        <div class="mt-5 rounded-lg bg-[color:var(--rvc-search)] p-3 text-xs"><strong>コードから取得済み</strong><p class="mt-1 text-[color:var(--rvc-muted)]">{viewModel.selectedCandidate.sourcePaths.length} ファイル / {viewModel.draft.workflows.length} Workflow</p></div>
      {:else if selectedWorkflow}
        <div class="mb-5 flex items-end gap-3">
          <label class="min-w-0 flex-1 text-xs text-[color:var(--rvc-muted)]">編集するWorkflow<select class={inputClass} value={viewModel.selectedWorkflowCode} onchange={(event) => viewModel.selectWorkflow(event.currentTarget.value)}>{#each viewModel.draft.workflows as workflow}<option value={workflow.code}>{workflow.name || workflow.code}</option>{/each}</select></label>
        </div>

        {#if stage === 'workflow'}
          <h3 class="text-base font-semibold">ワークフローの役割</h3>
          <p class="mt-1 text-xs text-[color:var(--rvc-muted)]">識別子とTemporal型はコードから取得します。非技術者が選択できる名前と、いつ使う処理かを記述してください。</p>
          <div class="mt-4 grid grid-cols-2 gap-3">
            <label class="text-xs text-[color:var(--rvc-muted)]">定義種別<select class={inputClass} value={selectedWorkflow.definition_type} onchange={(event) => viewModel.updateWorkflow({ definition_type: event.currentTarget.value as 'native_workflow' | 'workflow_template' })}><option value="native_workflow">native_workflow</option><option value="workflow_template">workflow_template</option></select></label>
            <label class="text-xs text-[color:var(--rvc-muted)]">Version<input class={inputClass} type="number" min="1" value={selectedWorkflow.version} oninput={(event) => viewModel.updateWorkflow({ version: Number(event.currentTarget.value) })} /></label>
            <label class="text-xs text-[color:var(--rvc-muted)]">Workflow code（コードから生成）<input class={readonlyClass} readonly value={selectedWorkflow.code} /></label>
            <label class="text-xs text-[color:var(--rvc-muted)]">Temporal Workflow type（コードから生成）<input class={readonlyClass} readonly value={selectedWorkflow.runtime.temporal_workflow_type} /></label>
            <label class="text-xs text-[color:var(--rvc-muted)]">表示名<input class={inputClass} value={selectedWorkflow.name} oninput={(event) => viewModel.updateWorkflow({ name: event.currentTarget.value })} /></label>
            <label class="text-xs text-[color:var(--rvc-muted)]">Owner system<input class={inputClass} value={selectedWorkflow.owner_system} oninput={(event) => viewModel.updateWorkflow({ owner_system: event.currentTarget.value })} /></label>
          </div>
          <label class="mt-3 block text-xs text-[color:var(--rvc-muted)]">説明<textarea class={`${inputClass} min-h-24`} value={selectedWorkflow.description} oninput={(event) => viewModel.updateWorkflow({ description: event.currentTarget.value })}></textarea></label>
        {:else if stage === 'inputs'}
          <h3 class="text-base font-semibold">設定と実行時入力</h3>
          <p class="mt-1 text-xs leading-5 text-[color:var(--rvc-muted)]">設定は登録時に固定する値、実行時入力は1回のJobごとに指定・取得する値です。各項目には利用者が理解できる説明と入手方法を記述します。</p>
          {#if selectedWorkflow.definition_type === 'workflow_template'}
            <div class="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-[color:var(--rvc-border)] p-3">
              <label class="text-xs text-[color:var(--rvc-muted)]">必要なEngine capability<input class={inputClass} value={selectedWorkflow.engine_requirement?.capability ?? ''} oninput={(event) => viewModel.updateWorkflow({ engine_requirement: { capability: event.currentTarget.value, required_operations: selectedWorkflow.engine_requirement?.required_operations ?? [] } })} /></label>
              <label class="text-xs text-[color:var(--rvc-muted)]">必要なoperation（カンマ区切り）<input class={inputClass} value={selectedWorkflow.engine_requirement?.required_operations.join(', ') ?? ''} oninput={(event) => viewModel.updateWorkflow({ engine_requirement: { capability: selectedWorkflow.engine_requirement?.capability ?? '', required_operations: splitList(event.currentTarget.value) } })} /></label>
            </div>
            <div class="mt-5"><FieldDefinitionEditor title="Workflow設定" fields={selectedWorkflow.configuration ?? []} requireSource onChange={(fields) => viewModel.setWorkflowFields('configuration', fields)} /></div>
          {/if}
          <div class="mt-6"><FieldDefinitionEditor title="Job実行時に要求する入力" fields={selectedWorkflow.run_request} requireSource onChange={(fields) => viewModel.setWorkflowFields('run_request', fields)} /></div>
        {:else if stage === 'steps'}
          <h3 class="text-base font-semibold">業務工程</h3>
          <p class="mt-1 text-xs leading-5 text-[color:var(--rvc-muted)]">順序・種別・実行operationはTemporalコードから生成されます。ここでは「何を行う工程か」「何を使い、何を報告するか」を人向けに補完します。</p>
          <div class="mt-4 grid grid-cols-[180px_minmax(0,1fr)] gap-4">
            <nav class="space-y-1 border-r border-[color:var(--rvc-border)] pr-3">{#each viewModel.stepRows as row}<button class={`w-full rounded px-2 py-1.5 text-left ${viewModel.selectedStepKey === row.key ? 'bg-[color:var(--rvc-accent)] text-white' : 'hover:bg-[color:var(--rvc-hover)]'}`} style={`padding-left:${8 + row.depth * 12}px`} onclick={() => viewModel.selectedStepKey = row.key}><span class="block truncate text-xs font-semibold">{row.name || row.key}</span><span class="font-mono text-[9px] opacity-70">{row.kind}</span></button>{/each}</nav>
            {#if selectedStep}<div class="min-w-0 space-y-4">
              <div class="grid grid-cols-2 gap-3"><label class="text-xs text-[color:var(--rvc-muted)]">Step key<input class={readonlyClass} readonly value={selectedStep.key} /></label><label class="text-xs text-[color:var(--rvc-muted)]">Kind<input class={readonlyClass} readonly value={selectedStep.kind} /></label><label class="text-xs text-[color:var(--rvc-muted)]">表示名<input class={inputClass} value={selectedStep.name} oninput={(event) => viewModel.updateStep({ name: event.currentTarget.value })} /></label>{#if selectedStep.component}<label class="text-xs text-[color:var(--rvc-muted)]">Component表示名<input class={inputClass} value={selectedStep.component.name} oninput={(event) => viewModel.updateStep({ component: { ...selectedStep.component!, name: event.currentTarget.value } })} /></label>{/if}</div>
              <label class="block text-xs text-[color:var(--rvc-muted)]">説明<textarea class={`${inputClass} min-h-20`} value={selectedStep.description} oninput={(event) => viewModel.updateStep({ description: event.currentTarget.value })}></textarea></label>
              <label class="block text-xs text-[color:var(--rvc-muted)]">完了条件・完了の見え方<input class={inputClass} value={selectedStep.completion ?? ''} oninput={(event) => viewModel.updateStep({ completion: event.currentTarget.value })} /></label>
              {#if selectedStep.component}<div class="rounded-lg bg-[color:var(--rvc-search)] p-3 font-mono text-[10px]">{selectedStep.component.kind}{selectedStep.component.operation ? ` / ${selectedStep.component.operation}` : ''}{selectedStep.component.signal ? ` / signal: ${selectedStep.component.signal}` : ''}</div>{/if}
              {#if selectedStep.kind === 'loop'}
                <div class="grid grid-cols-2 gap-2 rounded-lg border border-[color:var(--rvc-border)] p-3">
                  <h4 class="col-span-2 text-xs font-semibold">Loopの投影情報</h4>
                  <label class="text-xs text-[color:var(--rvc-muted)]">反復対象名<input class={inputClass} value={selectedStep.iteration?.item_name ?? ''} oninput={(event) => viewModel.updateStep({ iteration: { item_name: event.currentTarget.value, source: selectedStep.iteration?.source ?? '', description: selectedStep.iteration?.description ?? '' } })} /></label>
                  <label class="text-xs text-[color:var(--rvc-muted)]">取得先<input class={inputClass} value={selectedStep.iteration?.source ?? ''} oninput={(event) => viewModel.updateStep({ iteration: { item_name: selectedStep.iteration?.item_name ?? '', source: event.currentTarget.value, description: selectedStep.iteration?.description ?? '' } })} /></label>
                  <label class="col-span-2 text-xs text-[color:var(--rvc-muted)]">説明<input class={inputClass} value={selectedStep.iteration?.description ?? ''} oninput={(event) => viewModel.updateStep({ iteration: { item_name: selectedStep.iteration?.item_name ?? '', source: selectedStep.iteration?.source ?? '', description: event.currentTarget.value } })} /></label>
                </div>
              {/if}
              <div class="space-y-2">
                <div class="flex items-center justify-between"><h4 class="text-sm font-semibold">実行の事前条件</h4><button class="flex items-center gap-1 rounded-md border border-[color:var(--rvc-border)] px-2 py-1 text-xs" onclick={() => viewModel.setPrerequisites([...(selectedStep.prerequisites ?? []), { key: '', name: '', description: '' }])}><Plus size={13} />追加</button></div>
                {#each selectedStep.prerequisites ?? [] as prerequisite, index}
                  <div class="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 rounded-lg border border-[color:var(--rvc-border)] p-3">
                    <label class="text-[11px] text-[color:var(--rvc-muted)]">key<input class={inputClass} value={prerequisite.key} oninput={(event) => viewModel.setPrerequisites((selectedStep.prerequisites ?? []).map((item, current) => current === index ? { ...item, key: event.currentTarget.value } : item))} /></label>
                    <label class="text-[11px] text-[color:var(--rvc-muted)]">表示名<input class={inputClass} value={prerequisite.name} oninput={(event) => viewModel.setPrerequisites((selectedStep.prerequisites ?? []).map((item, current) => current === index ? { ...item, name: event.currentTarget.value } : item))} /></label>
                    <label class="text-[11px] text-[color:var(--rvc-muted)]">説明<input class={inputClass} value={prerequisite.description} oninput={(event) => viewModel.setPrerequisites((selectedStep.prerequisites ?? []).map((item, current) => current === index ? { ...item, description: event.currentTarget.value } : item))} /></label>
                    <button class="mt-6 text-[color:var(--rvc-danger)]" aria-label="事前条件を削除" onclick={() => viewModel.setPrerequisites((selectedStep.prerequisites ?? []).filter((_, current) => current !== index))}><Trash2 size={15} /></button>
                  </div>
                {/each}
              </div>
              {#if selectedStep.branches}{#each selectedStep.branches as branch}<div class="grid grid-cols-2 gap-2 rounded-lg border border-[color:var(--rvc-border)] p-3"><label class="text-xs text-[color:var(--rvc-muted)]">分岐 {branch.key} の表示名<input class={inputClass} value={branch.name} oninput={(event) => viewModel.updateBranch(branch.key, { name: event.currentTarget.value })} /></label><label class="text-xs text-[color:var(--rvc-muted)]">説明<input class={inputClass} value={branch.description} oninput={(event) => viewModel.updateBranch(branch.key, { description: event.currentTarget.value })} /></label></div>{/each}{/if}
              <FieldDefinitionEditor title="この工程が使う値" fields={selectedStep.uses ?? []} onChange={(fields) => viewModel.updateStepFields('uses', fields)} />
              <FieldDefinitionEditor title="この工程が報告する値" fields={selectedStep.reports ?? []} onChange={(fields) => viewModel.updateStepFields('reports', fields)} />
              <ArtifactDefinitionEditor title="この工程の成果物" artifacts={selectedStep.artifacts ?? []} onChange={(artifacts) => viewModel.updateStep({ artifacts })} />
            </div>{/if}
          </div>
        {:else if stage === 'results'}
          <h3 class="text-base font-semibold">実行結果と公開条件</h3>
          <p class="mt-1 text-xs text-[color:var(--rvc-muted)]">Job完了後に利用者へ見せる値・成果物と、このWorkflowの実行に必要な権限を記述します。</p>
          <div class="mt-5"><FieldDefinitionEditor title="Workflowの結果" fields={selectedWorkflow.result} onChange={(fields) => viewModel.setWorkflowFields('result', fields)} /></div>
          <div class="mt-6"><ArtifactDefinitionEditor title="Workflowの成果物" artifacts={selectedWorkflow.result_artifacts ?? []} onChange={(result_artifacts) => viewModel.updateWorkflow({ result_artifacts })} /></div>
          <label class="mt-5 block text-xs text-[color:var(--rvc-muted)]">必要な権限（改行またはカンマ区切り）<textarea class={`${inputClass} min-h-20 font-mono text-xs`} value={selectedWorkflow.required_permissions.join('\n')} oninput={(event) => viewModel.updateWorkflow({ required_permissions: splitList(event.currentTarget.value) })}></textarea></label>
          <label class="mt-3 block text-xs text-[color:var(--rvc-muted)]">変更理由<textarea class={`${inputClass} min-h-20`} value={selectedWorkflow.change_summary} oninput={(event) => viewModel.updateWorkflow({ change_summary: event.currentTarget.value })}></textarea></label>
        {:else if stage === 'review'}
          <div class="flex items-center gap-2"><h3 class="text-base font-semibold">確認・保存</h3>{#if viewModel.issues.length === 0}<span class="flex items-center gap-1 rounded-full bg-[color:#e8f7ee] px-2 py-0.5 text-[10px] font-semibold text-[color:#1a7f45]"><Check size={11} />契約を満たしています</span>{/if}</div>
          <p class="mt-1 text-xs text-[color:var(--rvc-muted)]">通常の保存では同じ場所の既存ファイルを `workflow_manifest_bak (n).json` へ退避してから保存します。</p>
          {#if viewModel.issues.length > 0}<div class="mt-4 rounded-lg border border-[color:#e5a000] bg-[color:#fff9e8] p-3"><strong class="text-xs">未入力・契約違反 {viewModel.issues.length}件</strong><ul class="mt-2 max-h-40 space-y-1 overflow-auto">{#each viewModel.issues as issue}<li class="text-[11px]"><code class="text-[color:var(--rvc-muted)]">{issue.path}</code> — {issue.message}</li>{/each}</ul></div>{/if}
          <details class="mt-4 rounded-lg border border-[color:var(--rvc-border)] bg-[color:#161b22] text-white" open><summary class="cursor-pointer px-3 py-2 text-xs font-semibold">生成されるJSON</summary><pre class="max-h-[420px] overflow-auto border-t border-white/10 p-3 text-[10px] leading-5">{viewModel.content()}</pre></details>
          {#if viewModel.saveResult}<div class="mt-4 rounded-lg bg-[color:#e8f7ee] p-3 text-xs text-[color:#1a7f45]"><strong>保存しました</strong><p class="mt-1 break-all font-mono text-[10px]">{viewModel.saveResult.path}</p>{#if viewModel.saveResult.backupPath}<p class="mt-1 break-all font-mono text-[10px]">Backup: {viewModel.saveResult.backupPath}</p>{/if}</div>{/if}
          <div class="mt-4 flex justify-end gap-2"><button class="rounded-md border border-[color:var(--rvc-border)] bg-white px-4 py-2 text-xs font-semibold disabled:opacity-40" disabled={viewModel.issues.length > 0 || viewModel.isSaving} onclick={() => viewModel.saveAs()}>別名で保存</button><button class="rounded-md bg-[color:var(--rvc-accent)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40" disabled={viewModel.issues.length > 0 || viewModel.isSaving} onclick={() => viewModel.save()}>{viewModel.isSaving ? '保存中…' : '保存'}</button></div>
        {/if}
      {/if}

      {#if stage !== 'review'}<div class="mt-6 flex justify-end"><button class="flex items-center gap-1 rounded-md bg-[color:var(--rvc-accent)] px-4 py-2 text-xs font-semibold text-white" onclick={() => { const index = stages.findIndex((item) => item.key === stage); stage = stages[Math.min(index + 1, stages.length - 1)]!.key; }}>次へ<ChevronRight size={14} /></button></div>{/if}
    </section>
  </div>
{/if}
