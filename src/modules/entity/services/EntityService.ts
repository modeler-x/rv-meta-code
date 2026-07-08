import type { IEntityRepository } from '@/modules/entity/repositories/EntityRepository';
import type { EntityDetail, EntitySummary } from '@/modules/entity/types/EntitySummary';
import type { Result } from '@/shared/result/Result';

export class EntityService {
  constructor(private readonly entityRepository: IEntityRepository) {}

  async loadEntities(schema?: string): Promise<Result<EntitySummary[]>> {
    return this.entityRepository.listEntities(schema);
  }

  async loadEntityDetail(entityId: number): Promise<Result<EntityDetail>> {
    return this.entityRepository.getEntityDetail(entityId);
  }

  async setReadOnly(schema: string, table: string, isReadOnly: boolean): Promise<Result<void>> {
    return this.entityRepository.setReadOnly(schema, table, isReadOnly);
  }
}
