import type { SchemaService } from '@/modules/schema/services/SchemaService';
import type { SchemaSummary } from '@/modules/schema/types/SchemaSummary';

export type SchemaViewModelState = {
  isLoading: boolean;
  hasError: boolean;
  schemas: SchemaSummary[];
};

export class SchemaViewModel {
  state: SchemaViewModelState = $state({ isLoading: false, hasError: false, schemas: [] });

  constructor(private readonly schemaService: SchemaService) {}

  async loadSchemas(): Promise<void> {
    this.state.isLoading = true;
    this.state.hasError = false;
    const result = await this.schemaService.loadSchemas();
    if (result.success) {
      this.state.schemas = result.data;
    } else {
      this.state.hasError = true;
    }
    this.state.isLoading = false;
  }
}
