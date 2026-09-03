import type {
  ComponentManifest, FieldDefinition, ManifestIssue, WorkerComponentCandidate,
  WorkflowBranch, WorkflowFrame, WorkflowFrameBranch, WorkflowFrameStep, WorkflowManifest, WorkflowStep
} from '@/modules/workflow-manifest/types/WorkflowManifest';

export class WorkflowManifestDraftService {
  create(candidate: WorkerComponentCandidate): ComponentManifest {
    // Candidate は Svelte の $state 配下では Proxy になる。
    // Workflow manifest は JSON 契約なので、JSON として複製して編集用の通常オブジェクトへ戻す。
    const existing = cloneManifest(candidate.manifest ?? { component: candidate.componentCode ?? '', workflows: [] });
    const byCode = new Map(existing.workflows.map((workflow) => [workflow.code, workflow]));
    for (const frame of candidate.workflows) {
      const current = byCode.get(frame.code);
      byCode.set(frame.code, current ? mergeWorkflow(current, frame) : newWorkflow(frame, existing.component));
    }
    return { component: existing.component || candidate.componentCode || '', workflows: [...byCode.values()] };
  }

  validate(manifest: ComponentManifest): ManifestIssue[] {
    const issues: ManifestIssue[] = [];
    if (!manifest.component.trim()) issue(issues, 'component', 'Component codeを入力してください。');
    if (manifest.workflows.length === 0) issue(issues, 'workflows', 'Workflow構造が見つかりません。');
    const codes = new Set<string>();
    for (const workflow of manifest.workflows) {
      const base = `workflows.${workflow.code || '?'}`;
      required(issues, `${base}.code`, workflow.code, 'Workflow code');
      required(issues, `${base}.name`, workflow.name, 'Workflow表示名');
      required(issues, `${base}.description`, workflow.description, 'Workflow説明');
      required(issues, `${base}.owner_system`, workflow.owner_system, 'Owner system');
      required(issues, `${base}.runtime.temporal_workflow_type`, workflow.runtime.temporal_workflow_type, 'Temporal Workflow type');
      required(issues, `${base}.change_summary`, workflow.change_summary, '変更理由');
      if (!['native_workflow', 'workflow_template'].includes(workflow.definition_type)) issue(issues, `${base}.definition_type`, '未対応の定義種別です。');
      if (workflow.version < 1) issue(issues, `${base}.version`, 'Versionは1以上です。');
      if (codes.has(workflow.code)) issue(issues, `${base}.code`, 'Workflow codeが重複しています。');
      codes.add(workflow.code);
      if (workflow.definition_type === 'workflow_template') {
        required(issues, `${base}.engine_requirement.capability`, workflow.engine_requirement?.capability ?? '', 'Engine capability');
        if ((workflow.engine_requirement?.required_operations.length ?? 0) === 0) issue(issues, `${base}.engine_requirement.required_operations`, '必要なEngine operationを入力してください。');
      }
      validateFields(issues, `${base}.configuration`, workflow.configuration ?? [], true);
      validateFields(issues, `${base}.run_request`, workflow.run_request, true);
      validateFields(issues, `${base}.result`, workflow.result, false);
      validateSteps(issues, `${base}.steps`, workflow.steps, new Set());
    }
    return issues;
  }
}

function cloneManifest(manifest: ComponentManifest): ComponentManifest {
  return JSON.parse(JSON.stringify(manifest)) as ComponentManifest;
}

function newWorkflow(frame: WorkflowFrame, ownerSystem: string): WorkflowManifest {
  return {
    definition_type: 'native_workflow', code: frame.code, name: '', description: '', owner_system: ownerSystem,
    version: 1, runtime: { temporal_workflow_type: frame.temporalWorkflowType }, run_request: [],
    steps: frame.steps.map(newStep), result: [], required_permissions: [], change_summary: ''
  };
}

function mergeWorkflow(current: WorkflowManifest, frame: WorkflowFrame): WorkflowManifest {
  return {
    ...current,
    code: frame.code,
    runtime: { ...current.runtime, temporal_workflow_type: frame.temporalWorkflowType },
    steps: mergeSteps(current.steps, frame.steps)
  };
}

function mergeSteps(existing: WorkflowStep[], frames: WorkflowFrameStep[]): WorkflowStep[] {
  const byKey = new Map(existing.map((step) => [step.key, step]));
  return frames.map((frame) => {
    const current = byKey.get(frame.key);
    const generated = newStep(frame);
    if (!current) return generated;
    const human = { ...current };
    delete human.component;
    delete human.branches;
    delete human.steps;
    return {
      ...human,
      key: frame.key,
      kind: frame.kind,
      ...(generated.component
        ? { component: { ...current.component, ...generated.component, name: current.component?.name ?? '' } }
        : {}),
      ...(frame.branches.length > 0 ? { branches: mergeBranches(current.branches ?? [], frame.branches) } : {}),
      ...(frame.steps.length > 0 ? { steps: mergeSteps(current.steps ?? [], frame.steps) } : {})
    };
  });
}

function mergeBranches(existing: WorkflowBranch[], frames: WorkflowFrameBranch[]): WorkflowBranch[] {
  const byKey = new Map(existing.map((branch) => [branch.key, branch]));
  return frames.map((frame) => {
    const current = byKey.get(frame.key);
    return {
      key: frame.key, name: current?.name ?? '', description: current?.description ?? '',
      ...(frame.outcome ? { outcome: frame.outcome } : {}),
      ...(frame.steps.length > 0 ? { steps: mergeSteps(current?.steps ?? [], frame.steps) } : {})
    };
  });
}

function newStep(frame: WorkflowFrameStep): WorkflowStep {
  const component = frame.componentKind ? {
    kind: frame.componentKind, name: '', ...(frame.operation ? { operation: frame.operation } : {}), ...(frame.signal ? { signal: frame.signal } : {})
  } : undefined;
  return {
    key: frame.key, kind: frame.kind, name: '', description: '', ...(component ? { component } : {}),
    ...(frame.branches.length > 0 ? { branches: frame.branches.map((branch) => ({
      key: branch.key, name: '', description: '', ...(branch.outcome ? { outcome: branch.outcome } : {}),
      ...(branch.steps.length > 0 ? { steps: branch.steps.map(newStep) } : {})
    })) } : {}),
    ...(frame.steps.length > 0 ? { steps: frame.steps.map(newStep) } : {})
  };
}

function validateFields(issues: ManifestIssue[], path: string, fields: FieldDefinition[], sourceRequired: boolean): void {
  const allowedSources = new Set(['user_input', 'user_selection', 'target_catalog', 'cabinet_file', 'cabinet_file_metadata', 'rv_spec_request', 'workflow_configuration', 'run_request', 'previous_step', 'system']);
  const keys = new Set<string>();
  fields.forEach((field, index) => {
    const base = `${path}.${field.key || index}`;
    required(issues, `${base}.key`, field.key, '項目key');
    required(issues, `${base}.name`, field.name, '表示名');
    required(issues, `${base}.description`, field.description, '説明');
    required(issues, `${base}.value_type`, field.value_type, '型');
    if (keys.has(field.key)) issue(issues, `${base}.key`, '項目keyが重複しています。');
    keys.add(field.key);
    if (sourceRequired) {
      required(issues, `${base}.source.kind`, field.source?.kind ?? '', '入手方法');
      required(issues, `${base}.source.label`, field.source?.label ?? '', '入手方法の説明');
    }
    if (field.source?.kind && !allowedSources.has(field.source.kind)) issue(issues, `${base}.source.kind`, `未対応の入手方法です: ${field.source.kind}`);
    if (field.required && field.example === undefined) issue(issues, `${base}.example`, '必須項目には入力例が必要です。');
  });
}

function validateSteps(issues: ManifestIssue[], path: string, steps: WorkflowStep[], keys: Set<string>, requireStep = true): void {
  const allowedKinds = new Set(['operation', 'decision', 'parallel', 'loop', 'wait', 'summary']);
  if (steps.length === 0 && requireStep) issue(issues, path, '業務工程がありません。');
  for (const step of steps) {
    const base = `${path}.${step.key || '?'}`;
    required(issues, `${base}.key`, step.key, 'Step key');
    required(issues, `${base}.kind`, step.kind, 'Step kind');
    required(issues, `${base}.name`, step.name, 'Step表示名');
    required(issues, `${base}.description`, step.description, 'Step説明');
    if (keys.has(step.key)) issue(issues, `${base}.key`, 'Step keyが重複しています。');
    keys.add(step.key);
    if (step.kind && !allowedKinds.has(step.kind)) issue(issues, `${base}.kind`, `未対応のStep kindです: ${step.kind}`);
    for (const prerequisite of step.prerequisites ?? []) {
      required(issues, `${base}.prerequisites.${prerequisite.key}.key`, prerequisite.key, '事前条件key');
      required(issues, `${base}.prerequisites.${prerequisite.key}.name`, prerequisite.name, '事前条件の表示名');
      required(issues, `${base}.prerequisites.${prerequisite.key}.description`, prerequisite.description, '事前条件の説明');
    }
    if (step.component) {
      required(issues, `${base}.component.kind`, step.component?.kind ?? '', 'Component kind');
      required(issues, `${base}.component.name`, step.component?.name ?? '', 'Component表示名');
    } else if (step.kind === 'operation' || step.kind === 'wait') {
      issue(issues, `${base}.component`, 'Componentを指定してください。');
    }
    if (step.component?.kind && !['engine_operation', 'approval'].includes(step.component.kind)) issue(issues, `${base}.component.kind`, `未対応のComponent kindです: ${step.component.kind}`);
    if (step.component?.kind === 'engine_operation') required(issues, `${base}.component.operation`, step.component.operation ?? '', 'Engine operation');
    if (step.component?.kind === 'approval') required(issues, `${base}.component.signal`, step.component.signal ?? '', '承認signal');
    validateStepFields(issues, `${base}.uses`, step.uses ?? []);
    validateStepFields(issues, `${base}.reports`, step.reports ?? []);
    if (step.kind === 'decision' || step.kind === 'parallel') {
      if ((step.branches?.length ?? 0) < 2) issue(issues, `${base}.branches`, '判断・並列処理には2つ以上の分岐が必要です。');
    }
    const branchKeys = new Set<string>();
    for (const branch of step.branches ?? []) {
      if (branchKeys.has(branch.key)) issue(issues, `${base}.branches.${branch.key}.key`, '分岐keyが重複しています。');
      branchKeys.add(branch.key);
      required(issues, `${base}.branches.${branch.key}.name`, branch.name, '分岐表示名');
      required(issues, `${base}.branches.${branch.key}.description`, branch.description, '分岐説明');
      if (step.kind === 'decision') required(issues, `${base}.branches.${branch.key}.outcome`, branch.outcome ?? '', '判断結果');
      validateSteps(issues, `${base}.branches.${branch.key}.steps`, branch.steps ?? [], keys, false);
    }
    if ((step.steps?.length ?? 0) > 0) validateSteps(issues, `${base}.steps`, step.steps ?? [], keys);
    if (step.kind === 'loop') {
      required(issues, `${base}.iteration.item_name`, step.iteration?.item_name ?? '', '反復対象名');
      required(issues, `${base}.iteration.source`, step.iteration?.source ?? '', '反復対象の取得先');
      required(issues, `${base}.iteration.description`, step.iteration?.description ?? '', '反復処理の説明');
      if ((step.steps?.length ?? 0) === 0) issue(issues, `${base}.steps`, 'Loopの内部工程がありません。');
    }
  }
}

function validateStepFields(issues: ManifestIssue[], path: string, fields: FieldDefinition[]): void {
  fields.forEach((field, index) => {
    const base = `${path}.${field.key || index}`;
    required(issues, `${base}.key`, field.key, '項目key');
    required(issues, `${base}.name`, field.name, '表示名');
    required(issues, `${base}.description`, field.description, '説明');
    required(issues, `${base}.value_type`, field.value_type, '型');
  });
}

function required(issues: ManifestIssue[], path: string, value: string, label: string): void {
  if (!value.trim()) issue(issues, path, `${label}を入力してください。`);
}
function issue(issues: ManifestIssue[], path: string, message: string): void { issues.push({ path, message }); }
