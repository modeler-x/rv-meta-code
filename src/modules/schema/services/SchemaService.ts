import type { ISchemaRepository } from '@/modules/schema/repositories/SchemaRepository';
import type { SchemaSummary } from '@/modules/schema/types/SchemaSummary';
import type { Result } from '@/shared/result/Result';

export class SchemaService {
  constructor(private readonly schemaRepository: ISchemaRepository) {}

  async loadSchemas(): Promise<Result<SchemaSummary[]>> {
    return this.schemaRepository.listSchemas();
  }
}
