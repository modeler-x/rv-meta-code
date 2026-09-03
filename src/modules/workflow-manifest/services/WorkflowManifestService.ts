import type { IWorkflowManifestRepository } from '@/modules/workflow-manifest/repositories/WorkflowManifestRepository';
import type { SaveResult, WorkerComponentCandidate } from '@/modules/workflow-manifest/types/WorkflowManifest';
import type { Result } from '@/shared/result/Result';

export class WorkflowManifestService {
  constructor(private readonly repository: IWorkflowManifestRepository) {}
  pickWorkspace(current: string): Promise<Result<string | null>> { return this.repository.pickWorkspace(current); }
  scan(root: string): Promise<Result<WorkerComponentCandidate[]>> { return this.repository.scan(root); }
  save(path: string, content: string): Promise<Result<SaveResult | null>> { return this.repository.save(path, content); }
  saveAs(path: string, content: string): Promise<Result<SaveResult | null>> { return this.repository.saveAs(path, content); }
}
