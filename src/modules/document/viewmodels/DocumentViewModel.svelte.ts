import type { DocumentService } from '@/modules/document/services/DocumentService';
import type { OpenApiDocumentSummary } from '@/modules/document/types/OpenApiDocumentSummary';
import type { OpenApiSpec } from '@/modules/document/types/OpenApiSpec';
import type { DocumentDetail } from '@/modules/document/types/DocumentDetail';
import type { ValidationReport } from '@/modules/sdk/types/SdkGeneration';

export class DocumentViewModel {
  documents: OpenApiDocumentSummary[] = $state([]);
  hasError = $state(false);
  // 出力プレビュー対象の OpenAPI 仕様。空ならシートは閉じている。
  previewSpecs: OpenApiSpec[] = $state([]);
  isExporting = $state(false);

  // Document 詳細（参照画面）。
  detail: DocumentDetail | null = $state(null);
  isDetailLoading = $state(false);
  validationReport: ValidationReport | null = $state(null);
  isValidating = $state(false);

  constructor(private readonly documentService: DocumentService) {}

  async loadDetail(schema: string): Promise<void> {
    this.isDetailLoading = true;
    this.detail = null;
    this.validationReport = null;
    const result = await this.documentService.loadDocumentDetail(schema);
    if (result.success) {
      this.detail = result.data;
    }
    this.isDetailLoading = false;
  }

  async validate(schema: string): Promise<void> {
    this.isValidating = true;
    const result = await this.documentService.validateOpenApi(schema);
    if (result.success) {
      this.validationReport = result.data;
    }
    this.isValidating = false;
  }

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
