import { describe, expect, it } from 'vitest';
import { ok, type Result } from '@/shared/result/Result';
import { SchemaService } from '@/modules/schema/services/SchemaService';
import type { ISchemaRepository } from '@/modules/schema/repositories/SchemaRepository';
import type { SchemaSummary } from '@/modules/schema/types/SchemaSummary';

class FakeSchemaRepository implements ISchemaRepository {
  async listSchemas(): Promise<Result<SchemaSummary[]>> {
    return ok([{ name: 'public', comment: 'standard public schema', tableCount: 4, viewCount: 2 }]);
  }
}

describe('SchemaService', () => {
  it('loads schema summaries from the repository', async () => {
    const service = new SchemaService(new FakeSchemaRepository());
    const result = await service.loadSchemas();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].name).toBe('public');
    }
  });
});
