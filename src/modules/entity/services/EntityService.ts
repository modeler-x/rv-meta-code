import type { IEntityRepository } from '@/modules/entity/repositories/EntityRepository';
import type { EntitySummary } from '@/modules/entity/types/EntitySummary';
import type { Result } from '@/shared/result/Result';

export class EntityService {
  constructor(private readonly entityRepository: IEntityRepository) {}

  async loadEntities(): Promise<Result<EntitySummary[]>> {
    return this.entityRepository.listEntities();
  }
}
