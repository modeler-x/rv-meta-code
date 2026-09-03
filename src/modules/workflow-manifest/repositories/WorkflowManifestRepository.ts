import { save as saveDialog, open } from '@tauri-apps/plugin-dialog';
import { fail, ok, type Result } from '@/shared/result/Result';
import { invokeTauri } from '@/shared/ipc/invokeTauri';
import { toIpcErrorMessage } from '@/shared/ipc/toIpcErrorMessage';
import type { SaveResult, WorkerComponentCandidate } from '@/modules/workflow-manifest/types/WorkflowManifest';

export interface IWorkflowManifestRepository {
  pickWorkspace(current: string): Promise<Result<string | null>>;
  scan(root: string): Promise<Result<WorkerComponentCandidate[]>>;
  save(path: string, content: string): Promise<Result<SaveResult | null>>;
  saveAs(defaultPath: string, content: string): Promise<Result<SaveResult | null>>;
}

export class WorkflowManifestRepository implements IWorkflowManifestRepository {
  async pickWorkspace(current: string): Promise<Result<string | null>> {
    try {
      const selected = await open({ directory: true, multiple: false, defaultPath: current || undefined });
      return ok(typeof selected === 'string' ? selected : null);
    } catch (error) {
      return fail('IPC_ERROR', toIpcErrorMessage(error));
    }
  }

  async scan(root: string): Promise<Result<WorkerComponentCandidate[]>> {
    try {
      return ok(await invokeTauri<WorkerComponentCandidate[]>('scan_worker_components', { root }));
    } catch (error) {
      return fail('IPC_ERROR', toIpcErrorMessage(error));
    }
  }

  async save(path: string, content: string): Promise<Result<SaveResult | null>> {
    try {
      const selected = await saveDialog({ defaultPath: path, filters: [{ name: 'Workflow manifest', extensions: ['json'] }] });
      if (!selected) return ok(null);
      const backupPath = await invokeTauri<string | null>('save_workflow_manifest', { path: selected, content });
      return ok({ path: selected, backupPath });
    } catch (error) {
      return fail('IPC_ERROR', toIpcErrorMessage(error));
    }
  }

  async saveAs(defaultPath: string, content: string): Promise<Result<SaveResult | null>> {
    try {
      const selected = await saveDialog({ defaultPath, filters: [{ name: 'Workflow manifest', extensions: ['json'] }] });
      if (!selected) return ok(null);
      await invokeTauri('save_workflow_manifest_as', { path: selected, content });
      return ok({ path: selected, backupPath: null });
    } catch (error) {
      return fail('IPC_ERROR', toIpcErrorMessage(error));
    }
  }
}
