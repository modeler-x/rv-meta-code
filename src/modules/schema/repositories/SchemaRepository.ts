import { ok, fail, type Result } from '@/shared/result/Result';
import { invokeTauri } from '@/shared/ipc/invokeTauri';
import type { SchemaSummary } from '@/modules/schema/types/SchemaSummary';

export interface ISchemaRepository {
  listSchemas(): Promise<Result<SchemaSummary[]>>;
}

type SchemaSummaryDto = {
  schemaName: string;
  comment: string | null;
  tableCount: number;
  viewCount: number;
};

export class SchemaRepository implements ISchemaRepository {
  async listSchemas(): Promise<Result<SchemaSummary[]>> {
    try {
      const rows = await invokeTauri<SchemaSummaryDto[]>('list_schemas');
      return ok(
        rows.map((row) => ({
          name: row.schemaName,
          comment: row.comment,
          tableCount: row.tableCount,
          viewCount: row.viewCount
        }))
      );
    } catch (error) {
      return fail<SchemaSummary[]>('IPC_ERROR', errorMessage(error));
    }
  }
}

function errorMessage(error: unknown): string {
  const shape = error as { message?: string } | null;
  return shape && typeof shape.message === 'string' ? shape.message : String(error);
}
