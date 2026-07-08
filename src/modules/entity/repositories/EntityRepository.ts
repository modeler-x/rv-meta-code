import { ok, fail, type Result } from '@/shared/result/Result';
import { invokeTauri } from '@/shared/ipc/invokeTauri';
import type { EntityDetail, EntitySummary } from '@/modules/entity/types/EntitySummary';

export interface IEntityRepository {
  listEntities(schema?: string): Promise<Result<EntitySummary[]>>;
  getEntityDetail(entityId: number): Promise<Result<EntityDetail>>;
}

function toErrorMessage(error: unknown): string {
  const shape = error as { message?: string } | null;
  return shape && typeof shape.message === 'string' ? shape.message : String(error);
}

export class EntityRepository implements IEntityRepository {
  async listEntities(schema?: string): Promise<Result<EntitySummary[]>> {
    try {
      return ok(await invokeTauri<EntitySummary[]>('list_entities', { schema: schema ?? null }));
    } catch (error) {
      return fail<EntitySummary[]>('IPC_ERROR', toErrorMessage(error));
    }
  }

  async getEntityDetail(entityId: number): Promise<Result<EntityDetail>> {
    try {
      return ok(await invokeTauri<EntityDetail>('get_entity_detail', { entityId }));
    } catch (error) {
      return fail<EntityDetail>('IPC_ERROR', toErrorMessage(error));
    }
  }
}
