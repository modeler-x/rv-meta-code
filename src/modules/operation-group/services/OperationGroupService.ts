import type { IOperationGroupRepository } from '@/modules/operation-group/repositories/OperationGroupRepository';
import type {
  OperationGroupDetail,
  OperationGroupSummary
} from '@/modules/operation-group/types/OperationGroupSummary';
import type { Result } from '@/shared/result/Result';

export class OperationGroupService {
  constructor(private readonly operationGroupRepository: IOperationGroupRepository) {}

  async loadOperationGroups(schema: string): Promise<Result<OperationGroupSummary[]>> {
    return this.operationGroupRepository.listOperationGroups(schema);
  }

  async loadOperationGroupDetail(
    schema: string,
    groupKey: string
  ): Promise<Result<OperationGroupDetail>> {
    return this.operationGroupRepository.getOperationGroupDetail(schema, groupKey);
  }
}
