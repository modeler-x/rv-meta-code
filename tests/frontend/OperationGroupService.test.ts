import { describe, it, expect } from 'vitest';
import { OperationGroupService } from '@/modules/operation-group/services/OperationGroupService';
import type { IOperationGroupRepository } from '@/modules/operation-group/repositories/OperationGroupRepository';
import { ok, fail, type Result } from '@/shared/result/Result';
import type {
  OperationGroupDetail,
  OperationGroupSummary
} from '@/modules/operation-group/types/OperationGroupSummary';
import type { OperationSummary } from '@/modules/operation/types/OperationSummary';

// Auth に依存しない架空の Operation Group を使う（生成処理の分岐条件にしない）。
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
  security: [{ bearerAuth: [] }],
  summary: 'Get item',
  description: null,
  parameters: [],
  requestBody: null,
  responses: { '200': { description: 'OK' } },
  requiredFields: [],
  effectiveSecurity: [{ bearerAuth: [] }],
  securitySource: 'operation',
  functionSchema: 'rv_auth',
  functionName: 'get_item',
  identityArguments: 'p_item_id bigint',
  openapiSource: 'get item\n@openapi {"operationId":"exampleGetItem"}'
};

class FakeOperationGroupRepository implements IOperationGroupRepository {
  async listOperationGroups(schema?: string): Promise<Result<OperationGroupSummary[]>> {
    if (schema === 'missing') return fail('IPC_ERROR', 'boom');
    return ok([
      { id: 1, documentId: 9, schemaName: 'rv_example', groupKey: 'example', displayName: 'Example', description: null, operationCount: 2 },
      { id: 2, documentId: 9, schemaName: 'rv_example', groupKey: 'orders', displayName: 'Orders', description: 'order ops', operationCount: 1 }
    ]);
  }
  async getOperationGroupDetail(
    _schema: string,
    groupKey: string
  ): Promise<Result<OperationGroupDetail>> {
    return ok({
      operationGroup: { id: 5, documentId: 9, schemaName: 'rv_example', groupKey, displayName: 'Example', description: null, operationCount: 1 },
      operations: [exampleOperation],
      components: {}
    });
  }
}

describe('OperationGroupService', () => {
  const service = new OperationGroupService(new FakeOperationGroupRepository());

  it('loads operation groups for a schema', async () => {
    const result = await service.loadOperationGroups('app');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.map((g) => g.groupKey)).toEqual(['example', 'orders']);
      expect(result.data[0].operationCount).toBe(2);
    }
  });

  it('propagates repository failure as a Result error', async () => {
    const result = await service.loadOperationGroups('missing');
    expect(result.success).toBe(false);
  });

  it('loads operation group detail with function operations', async () => {
    const result = await service.loadOperationGroupDetail('app', 'example');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.operationGroup.groupKey).toBe('example');
      expect(result.data.operations).toHaveLength(1);
      // operationRowId(id) と operationId(文字列) は別物。
      expect(result.data.operations[0].id).toBe(10);
      expect(result.data.operations[0].operationId).toBe('exampleGetItem');
      expect(result.data.operations[0].ownerKind).toBe('operationGroup');
    }
  });
});
