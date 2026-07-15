import { ok, fail, type Result } from '@/shared/result/Result';
import { invokeTauri } from '@/shared/ipc/invokeTauri';
import { toIpcErrorMessage } from '@/shared/ipc/toIpcErrorMessage';
import type {
  OperationGroupDetail,
  OperationGroupSummary
} from '@/modules/operation-group/types/OperationGroupSummary';

export interface IOperationGroupRepository {
  listOperationGroups(schema: string): Promise<Result<OperationGroupSummary[]>>;
  getOperationGroupDetail(schema: string, groupKey: string): Promise<Result<OperationGroupDetail>>;
}

export class OperationGroupRepository implements IOperationGroupRepository {
  async listOperationGroups(schema: string): Promise<Result<OperationGroupSummary[]>> {
    try {
      return ok(await invokeTauri<OperationGroupSummary[]>('list_operation_groups', { schema }));
    } catch (error) {
      return fail<OperationGroupSummary[]>('IPC_ERROR', toIpcErrorMessage(error));
    }
  }

  async getOperationGroupDetail(
    schema: string,
    groupKey: string
  ): Promise<Result<OperationGroupDetail>> {
    try {
      return ok(
        await invokeTauri<OperationGroupDetail>('get_operation_group_detail', { schema, groupKey })
      );
    } catch (error) {
      return fail<OperationGroupDetail>('IPC_ERROR', toIpcErrorMessage(error));
    }
  }
}
