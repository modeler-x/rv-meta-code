import type { IDocumentRepository } from '@/modules/document/repositories/DocumentRepository';
import type { OpenApiDocumentSummary } from '@/modules/document/types/OpenApiDocumentSummary';
import type { OpenApiSpec } from '@/modules/document/types/OpenApiSpec';
import type { DocumentDetail } from '@/modules/document/types/DocumentDetail';
import type { ValidationReport } from '@/modules/sdk/types/SdkGeneration';
import type { Result } from '@/shared/result/Result';

export class DocumentService {
  constructor(private readonly documentRepository: IDocumentRepository) {}

  async loadDocuments(): Promise<Result<OpenApiDocumentSummary[]>> {
    return this.documentRepository.listDocuments();
  }

  async loadSpecs(schemas: string[]): Promise<Result<OpenApiSpec[]>> {
    return this.documentRepository.getSpecs(schemas);
  }

  async loadDocumentDetail(schema: string): Promise<Result<DocumentDetail>> {
    return this.documentRepository.getDocumentDetail(schema);
  }

  async validateOpenApi(schema: string): Promise<Result<ValidationReport>> {
    return this.documentRepository.validateOpenApi(schema);
  }
}
