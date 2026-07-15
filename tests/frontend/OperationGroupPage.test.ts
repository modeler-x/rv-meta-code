import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, it, expect } from 'vitest';
import OperationGroupDetailPage from '@/pages/OperationGroupDetailPage.svelte';
import OperationDetailPage from '@/pages/OperationDetailPage.svelte';
import { OperationGroupViewModel } from '@/modules/operation-group/viewmodels/OperationGroupViewModel.svelte';
import { OperationGroupService } from '@/modules/operation-group/services/OperationGroupService';
import type { IOperationGroupRepository } from '@/modules/operation-group/repositories/OperationGroupRepository';
import { ok, fail, type Result } from '@/shared/result/Result';
import type {
  OperationGroupDetail,
  OperationGroupSummary
} from '@/modules/operation-group/types/OperationGroupSummary';
import type { OperationSummary } from '@/modules/operation/types/OperationSummary';

const exampleOperation: OperationSummary = {
  id: 10,
  operationId: 'exampleGetItem',
  ownerKind: 'operationGroup',
  entityId: null,
  operationGroupId: 5,
  operation: 'exampleGetItem',
  method: 'GET',
  path: '/example/items/{itemId}',
  tags: ['Example'],
  security: [{ apiKeyAuth: [] }],
  summary: 'Get item',
  description: null,
  parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } }],
  requestBody: null,
  responses: { '200': { description: 'OK' } },
  requiredFields: [],
  effectiveSecurity: [{ apiKeyAuth: [] }],
  securitySource: 'operation'
};

const group: OperationGroupSummary = {
  id: 5,
  documentId: 9,
  groupKey: 'example',
  displayName: 'Example',
  description: null,
  operationCount: 1
};

class FakeRepo implements IOperationGroupRepository {
  constructor(private readonly failList = false) {}
  async listOperationGroups(): Promise<Result<OperationGroupSummary[]>> {
    if (this.failList) return fail('IPC_ERROR', 'load failed');
    return ok([group]);
  }
  async getOperationGroupDetail(): Promise<Result<OperationGroupDetail>> {
    return ok({ operationGroup: group, operations: [exampleOperation], components: {} });
  }
}

describe('Operation Group detail rendering', () => {
  it('lists function operations loaded after mount (path + operationId)', async () => {
    const vm = new OperationGroupViewModel(new OperationGroupService(new FakeRepo()));
    await vm.loadDetail('app', 'example');
    await tick();
    const { container } = render(OperationGroupDetailPage, {
      props: { group, operations: vm.detail?.operations ?? [], onOpenOperation: () => {} }
    });
    const text = container.textContent ?? '';
    expect(text).toContain('/example/items/{itemId}');
    expect(text).toContain('exampleGetItem');
  });

  it('shows the shared Operation detail with operationId, tags and effective security', () => {
    const { container } = render(OperationDetailPage, {
      props: { subtitle: 'Example', operation: exampleOperation }
    });
    const text = container.textContent ?? '';
    expect(text).toContain('exampleGetItem');
    expect(text).toContain('Example');
    expect(text).toContain('apiKeyAuth');
  });
});

describe('OperationGroupViewModel state', () => {
  it('distinguishes a successful empty result from a load error', async () => {
    const okEmpty = new OperationGroupViewModel(
      new OperationGroupService({
        async listOperationGroups() {
          return ok([]);
        },
        async getOperationGroupDetail() {
          return ok({ operationGroup: group, operations: [], components: {} });
        }
      })
    );
    await okEmpty.loadGroups('app');
    expect(okEmpty.groups).toEqual([]);
    expect(okEmpty.groupsError).toBeNull();

    const errored = new OperationGroupViewModel(new OperationGroupService(new FakeRepo(true)));
    await errored.loadGroups('app');
    expect(errored.groups).toEqual([]);
    expect(errored.groupsError).toBe('load failed');
  });
});
