import type { DocumentService } from '@/modules/document/services/DocumentService';
import type { OpenApiDocumentSummary } from '@/modules/document/types/OpenApiDocumentSummary';
import type { OpenApiSpec } from '@/modules/document/types/OpenApiSpec';

export class DocumentViewModel {
  documents: OpenApiDocumentSummary[] = $state([]);
  hasError = $state(false);
  // 出力プレビュー対象の OpenAPI 仕様。空ならシートは閉じている。
  previewSpecs: OpenApiSpec[] = $state([]);
  isExporting = $state(false);

  constructor(private readonly documentService: DocumentService) {}

  async loadDocuments(): Promise<void> {
    this.hasError = false;
    const result = await this.documentService.loadDocuments();
    if (result.success) {
      this.documents = result.data;
    } else {
      this.hasError = true;
    }
  }

  /** 選択スキーマの OpenAPI 仕様を取得しプレビューを開く。 */
  async exportSpecs(schemas: string[]): Promise<void> {
    if (schemas.length === 0) return;
    this.isExporting = true;
    const result = await this.documentService.loadSpecs(schemas);
    if (result.success) {
      this.previewSpecs = result.data;
    }
    this.isExporting = false;
  }

  closePreview(): void {
    this.previewSpecs = [];
  }

  findDocument(documentId?: string): OpenApiDocumentSummary | undefined {
    return this.documents.find((document) => String(document.id) === documentId);
  }
}
