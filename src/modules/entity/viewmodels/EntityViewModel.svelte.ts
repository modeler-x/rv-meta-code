import type { EntityService } from '@/modules/entity/services/EntityService';
import type { EntityDetail, EntitySummary } from '@/modules/entity/types/EntitySummary';

export class EntityViewModel {
  entities: EntitySummary[] = $state([]);
  detail: EntityDetail | null = $state(null);
  isDetailLoading = $state(false);

  constructor(private readonly entityService: EntityService) {}

  /** schema 未指定なら全ドキュメント横断。 */
  async loadEntities(schema?: string): Promise<void> {
    const result = await this.entityService.loadEntities(schema);
    if (result.success) {
      this.entities = result.data;
    }
  }

  async loadDetail(entityId: number): Promise<void> {
    this.isDetailLoading = true;
    this.detail = null;
    const result = await this.entityService.loadEntityDetail(entityId);
    if (result.success) {
      this.detail = result.data;
    }
    this.isDetailLoading = false;
  }

  findEntity(entityId?: string): EntitySummary | undefined {
    return this.entities.find((entity) => String(entity.id) === entityId);
  }
}
