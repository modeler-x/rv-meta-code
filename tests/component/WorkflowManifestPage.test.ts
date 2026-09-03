import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import WorkflowManifestPage from '@/pages/WorkflowManifestPage.svelte';
import { WorkflowManifestViewModel } from '@/modules/workflow-manifest/viewmodels/WorkflowManifestViewModel.svelte';
import { WorkflowManifestService } from '@/modules/workflow-manifest/services/WorkflowManifestService';
import type { IWorkflowManifestRepository } from '@/modules/workflow-manifest/repositories/WorkflowManifestRepository';
import type { SaveResult, WorkerComponentCandidate } from '@/modules/workflow-manifest/types/WorkflowManifest';
import { ok, type Result } from '@/shared/result/Result';

class FakeWorkflowManifestRepository implements IWorkflowManifestRepository {
  async pickWorkspace(): Promise<Result<string | null>> { return ok('/worker'); }
  async scan(): Promise<Result<WorkerComponentCandidate[]>> { return ok([]); }
  async save(): Promise<Result<SaveResult | null>> { return ok(null); }
  async saveAs(): Promise<Result<SaveResult | null>> { return ok(null); }
}

describe('WorkflowManifestPage', () => {
  it('separates generated structure from human-facing step annotations', async () => {
    const viewModel = new WorkflowManifestViewModel(new WorkflowManifestService(new FakeWorkflowManifestRepository()));
    viewModel.selectCandidate({
      id: '/worker/structure-spec', directory: '/worker/structure-spec', componentCode: 'structure-spec',
      manifestPath: null, sourcePaths: ['/worker/structure-spec/workflows.go'], manifest: null,
      workflows: [{ code: 'structure-spec.import', temporalWorkflowType: 'StructureSpecImportWorkflow', steps: [
        { key: 'plan', kind: 'operation', componentKind: 'engine_operation', operation: 'plan', branches: [], steps: [] }
      ] }]
    });

    const screen = render(WorkflowManifestPage, { props: { viewModel } });
    await fireEvent.click(screen.getByRole('button', { name: /業務工程/ }));

    expect((screen.getByDisplayValue('plan') as HTMLInputElement).readOnly).toBe(true);
    expect((screen.getByDisplayValue('operation') as HTMLInputElement).readOnly).toBe(true);
    expect(screen.getByText(/実行制御は変更しません/)).toBeTruthy();
    expect(screen.getByText(/人向けに補完します/)).toBeTruthy();
  });
});
