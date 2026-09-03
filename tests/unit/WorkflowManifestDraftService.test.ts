import { describe, expect, it } from 'vitest';
import { WorkflowManifestDraftService } from '@/modules/workflow-manifest/services/WorkflowManifestDraftService';
import type { WorkerComponentCandidate } from '@/modules/workflow-manifest/types/WorkflowManifest';

describe('WorkflowManifestDraftService', () => {
  it('creates a draft from a reactive proxy returned by the candidate list', () => {
    const manifest = {
      component: 'structure-spec',
      workflows: []
    };
    const candidate: WorkerComponentCandidate = {
      id: '/worker/component',
      directory: '/worker/component',
      componentCode: 'structure-spec',
      manifestPath: '/worker/component/workflow_manifest.json',
      sourcePaths: [],
      manifest: new Proxy(manifest, {}) as WorkerComponentCandidate['manifest'],
      workflows: []
    };

    const draft = new WorkflowManifestDraftService().create(candidate);

    expect(draft).toEqual(manifest);
    expect(draft).not.toBe(manifest);
  });

  it('refreshes structural fields and keeps human-facing descriptions', () => {
    const candidate: WorkerComponentCandidate = {
      id: '/worker/component',
      directory: '/worker/component',
      componentCode: 'structure-spec',
      manifestPath: '/worker/component/workflow_manifest.json',
      sourcePaths: ['/worker/component/workflows.go'],
      workflows: [{
        code: 'structure-spec-import',
        temporalWorkflowType: 'StructureSpecImportWorkflowV2',
        steps: [{
          key: 'plan', kind: 'operation', componentKind: 'engine_operation', operation: 'plan-v2',
          branches: [], steps: []
        }]
      }],
      manifest: {
        component: 'structure-spec',
        workflows: [{
          definition_type: 'native_workflow',
          code: 'structure-spec-import',
          name: 'XMIを取り込む',
          description: 'XMIを検証して反映します。',
          owner_system: 'structure-spec',
          version: 1,
          runtime: { temporal_workflow_type: 'StructureSpecImportWorkflow' },
          run_request: [],
          steps: [{
            key: 'plan', kind: 'operation', name: '変更案を作成', description: '反映前の差分を確認します。',
            component: { kind: 'engine_operation', name: 'Structure Spec Engine', operation: 'plan' }
          }],
          result: [], required_permissions: [], change_summary: '初回公開'
        }]
      }
    };

    const draft = new WorkflowManifestDraftService().create(candidate);
    const workflow = draft.workflows[0]!;
    expect(workflow.name).toBe('XMIを取り込む');
    expect(workflow.runtime.temporal_workflow_type).toBe('StructureSpecImportWorkflowV2');
    expect(workflow.steps[0]?.name).toBe('変更案を作成');
    expect(workflow.steps[0]?.component?.operation).toBe('plan-v2');
    expect(workflow.steps[0]?.component?.name).toBe('Structure Spec Engine');
  });

  it('allows a terminal decision branch without nested steps', () => {
    const manifest = new WorkflowManifestDraftService().create({
      id: '/worker', directory: '/worker', componentCode: 'sample', manifestPath: null, sourcePaths: [], manifest: null,
      workflows: [{ code: 'sample', temporalWorkflowType: 'SampleWorkflow', steps: [{
        key: 'decision', kind: 'decision', branches: [
          { key: 'accepted', outcome: 'accepted', steps: [] },
          { key: 'rejected', outcome: 'rejected', steps: [] }
        ], steps: []
      }] }]
    });
    const workflow = manifest.workflows[0]!;
    Object.assign(workflow, { name: '判断する', description: '入力を判断します。', owner_system: 'sample', change_summary: '初回公開' });
    Object.assign(workflow.steps[0]!, { name: '判断', description: '入力条件を確認します。' });
    for (const branch of workflow.steps[0]!.branches ?? []) Object.assign(branch, { name: branch.key, description: `${branch.key}の場合` });

    const issues = new WorkflowManifestDraftService().validate(manifest);
    expect(issues.some((issue) => issue.message === '業務工程がありません。')).toBe(false);
  });
});
