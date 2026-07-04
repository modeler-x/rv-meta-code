import type { EntityService } from '@/modules/entity/services/EntityService';
import type { EntitySummary } from '@/modules/entity/types/EntitySummary';

export class EntityViewModel {
  entities: EntitySummary[] = $state([]);

  constructor(private readonly entityService: EntityService) {}

  async loadEntities(): Promise<void> {
    const result = await this.entityService.loadEntities();
    if (result.success) {
      this.entities = result.data;
    }
  }

  get tables(): EntitySummary[] {
    return this.entities.filter((entity) => entity.kind === 'Table');
  }

  get views(): EntitySummary[] {
    return this.entities.filter((entity) => entity.kind === 'View');
  }

  findEntity(entityId?: string): EntitySummary | undefined {
    return this.entities.find((entity) => entity.id === entityId);
  }
}
