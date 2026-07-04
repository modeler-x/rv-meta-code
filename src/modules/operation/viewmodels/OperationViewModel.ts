import type { OperationService } from '@/modules/operation/services/OperationService';
import type { EntitySummary } from '@/modules/entity/types/EntitySummary';
import type { OperationSummary } from '@/modules/operation/types/OperationSummary';

export class OperationViewModel {
  constructor(private readonly operationService: OperationService) {}

  listOperations(entity: EntitySummary | undefined): OperationSummary[] {
    return entity ? this.operationService.loadOperations(entity) : [];
  }

  findOperation(entity: EntitySummary | undefined, operationId?: string): OperationSummary | undefined {
    return this.listOperations(entity).find((operation) => operation.id === operationId);
  }
}
