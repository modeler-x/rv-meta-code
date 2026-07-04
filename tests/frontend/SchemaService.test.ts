import { describe, expect, it } from 'vitest';
import { SchemaRepository } from '@/modules/schema/repositories/SchemaRepository';
import { SchemaService } from '@/modules/schema/services/SchemaService';

describe('SchemaService', () => {
  it('loads schema summaries from the repository', async () => {
    const service = new SchemaService(new SchemaRepository());
    const result = await service.loadSchemas();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].name).toBe('public');
    }
  });
});
