import type { WorkflowManifestService } from '@/modules/workflow-manifest/services/WorkflowManifestService';
import { WorkflowManifestDraftService } from '@/modules/workflow-manifest/services/WorkflowManifestDraftService';
import type {
  ComponentManifest, FieldDefinition, ManifestIssue, SaveResult, WorkerComponentCandidate,
  WorkflowBranch, WorkflowManifest, WorkflowPrerequisite, WorkflowStep
} from '@/modules/workflow-manifest/types/WorkflowManifest';

export type WorkflowStepRow = { key: string; name: string; kind: string; depth: number };

export class WorkflowManifestViewModel {
  workspace = $state('');
  candidates: WorkerComponentCandidate[] = $state([]);
  selectedCandidate: WorkerComponentCandidate | null = $state(null);
  draft: ComponentManifest | null = $state(null);
  selectedWorkflowCode = $state('');
  selectedStepKey = $state('');
  query = $state('');
  isScanning = $state(false);
  isSaving = $state(false);
  errorMessage: string | null = $state(null);
  saveResult: SaveResult | null = $state(null);

  constructor(
    private readonly service: WorkflowManifestService,
    private readonly draftService = new WorkflowManifestDraftService()
  ) {}

  get filteredCandidates(): WorkerComponentCandidate[] {
    const needle = this.query.trim().toLowerCase();
    if (!needle) return this.candidates;
    return this.candidates.filter((candidate) => `${candidate.componentCode ?? ''} ${candidate.directory} ${candidate.workflows.map((workflow) => workflow.code).join(' ')}`.toLowerCase().includes(needle));
  }

  get selectedWorkflow(): WorkflowManifest | null {
    return this.draft?.workflows.find((workflow) => workflow.code === this.selectedWorkflowCode) ?? null;
  }

  get stepRows(): WorkflowStepRow[] {
    return flattenSteps(this.selectedWorkflow?.steps ?? []);
  }

  get selectedStep(): WorkflowStep | null {
    return findStep(this.selectedWorkflow?.steps ?? [], this.selectedStepKey);
  }

  get issues(): ManifestIssue[] { return this.draft ? this.draftService.validate(this.draft) : []; }

  async chooseWorkspace(): Promise<void> {
    this.errorMessage = null;
    const result = await this.service.pickWorkspace(this.workspace);
    if (!result.success) { this.errorMessage = result.error.message; return; }
    if (!result.data) return;
    this.workspace = result.data;
    await this.scan();
  }

  async scan(): Promise<void> {
    if (!this.workspace.trim()) return;
    this.isScanning = true;
    this.errorMessage = null;
    const result = await this.service.scan(this.workspace);
    if (result.success) this.candidates = result.data;
    else this.errorMessage = result.error.message;
    this.isScanning = false;
  }

  selectCandidate(candidate: WorkerComponentCandidate): void {
    this.selectedCandidate = candidate;
    this.draft = this.draftService.create(candidate);
    this.selectedWorkflowCode = this.draft.workflows[0]?.code ?? '';
    this.selectedStepKey = this.draft.workflows[0]?.steps[0]?.key ?? '';
    this.saveResult = null;
  }

  selectWorkflow(code: string): void {
    this.selectedWorkflowCode = code;
    this.selectedStepKey = this.selectedWorkflow?.steps[0]?.key ?? '';
  }

  updateComponentCode(value: string): void {
    if (this.draft) this.draft.component = value;
  }

  updateWorkflow(values: Partial<WorkflowManifest>): void {
    const workflow = this.selectedWorkflow;
    if (workflow) Object.assign(workflow, values);
  }

  setWorkflowFields(group: 'configuration' | 'run_request' | 'result', fields: FieldDefinition[]): void {
    const workflow = this.selectedWorkflow;
    if (workflow) workflow[group] = fields;
  }

  updateStep(values: Partial<WorkflowStep>): void {
    const step = this.selectedStep;
    if (step) Object.assign(step, values);
  }

  updateStepFields(group: 'uses' | 'reports', fields: FieldDefinition[]): void {
    const step = this.selectedStep;
    if (step) step[group] = fields;
  }

  setPrerequisites(value: WorkflowPrerequisite[]): void {
    const step = this.selectedStep;
    if (step) step.prerequisites = value;
  }

  updateBranch(key: string, values: Partial<WorkflowBranch>): void {
    const branch = this.selectedStep?.branches?.find((item) => item.key === key);
    if (branch) Object.assign(branch, values);
  }

  async save(): Promise<void> {
    const candidate = this.selectedCandidate;
    if (!candidate || !this.draft || this.issues.length > 0) return;
    const defaultPath = candidate.manifestPath ?? `${candidate.directory}/workflow_manifest.json`;
    await this.runSave(() => this.service.save(defaultPath, this.content()));
  }

  async saveAs(): Promise<void> {
    const candidate = this.selectedCandidate;
    if (!candidate || !this.draft || this.issues.length > 0) return;
    await this.runSave(() => this.service.saveAs(`${candidate.directory}/workflow_manifest.json`, this.content()));
  }

  content(): string { return JSON.stringify(this.draft, null, 2); }

  private async runSave(operation: () => ReturnType<WorkflowManifestService['save']>): Promise<void> {
    this.isSaving = true;
    this.errorMessage = null;
    const result = await operation();
    if (result.success) {
      if (result.data) this.saveResult = result.data;
    } else this.errorMessage = result.error.message;
    this.isSaving = false;
  }
}

function flattenSteps(steps: WorkflowStep[], depth = 0): WorkflowStepRow[] {
  const result: WorkflowStepRow[] = [];
  for (const step of steps) {
    result.push({ key: step.key, name: step.name, kind: step.kind, depth });
    for (const branch of step.branches ?? []) result.push(...flattenSteps(branch.steps ?? [], depth + 1));
    result.push(...flattenSteps(step.steps ?? [], depth + 1));
  }
  return result;
}

function findStep(steps: WorkflowStep[], key: string): WorkflowStep | null {
  for (const step of steps) {
    if (step.key === key) return step;
    for (const branch of step.branches ?? []) {
      const found = findStep(branch.steps ?? [], key);
      if (found) return found;
    }
    const nested = findStep(step.steps ?? [], key);
    if (nested) return nested;
  }
  return null;
}
