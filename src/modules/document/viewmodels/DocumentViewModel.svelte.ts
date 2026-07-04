import type { DocumentService } from '@/modules/document/services/DocumentService';
import type { OpenApiDocumentSummary } from '@/modules/document/types/OpenApiDocumentSummary';

export class DocumentViewModel {
  documents: OpenApiDocumentSummary[] = $state([]);
  hasError = $state(false);

  constructor(private readonly documentService: DocumentService) {}

  async loadDocuments(): Promise<void> {
    const result = await this.documentService.loadDocuments();
    if (result.success) {
      this.documents = result.data;
    } else {
      this.hasError = true;
    }
  }

  findDocument(documentId?: string): OpenApiDocumentSummary | undefined {
    return this.documents.find((document) => document.id === documentId);
  }
}
