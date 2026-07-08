import type { IDocumentRepository } from '@/modules/document/repositories/DocumentRepository';
import type { OpenApiDocumentSummary } from '@/modules/document/types/OpenApiDocumentSummary';
import type { OpenApiSpec } from '@/modules/document/types/OpenApiSpec';
import type { Result } from '@/shared/result/Result';

export class DocumentService {
  constructor(private readonly documentRepository: IDocumentRepository) {}

  async loadDocuments(): Promise<Result<OpenApiDocumentSummary[]>> {
    return this.documentRepository.listDocuments();
  }

  async loadSpecs(schemas: string[]): Promise<Result<OpenApiSpec[]>> {
    return this.documentRepository.getSpecs(schemas);
  }
}
