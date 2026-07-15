import { ok, fail, type Result } from '@/shared/result/Result';
import { invokeTauri } from '@/shared/ipc/invokeTauri';
import { toIpcErrorMessage as toErrorMessage } from '@/shared/ipc/toIpcErrorMessage';
import type { OpenApiDocumentSummary } from '@/modules/document/types/OpenApiDocumentSummary';
import type { OpenApiSpec } from '@/modules/document/types/OpenApiSpec';
import type { DocumentDetail } from '@/modules/document/types/DocumentDetail';
import type { ValidationReport } from '@/modules/sdk/types/SdkGeneration';

export interface IDocumentRepository {
  listDocuments(): Promise<Result<OpenApiDocumentSummary[]>>;
  getSpecs(schemas: string[]): Promise<Result<OpenApiSpec[]>>;
  getDocumentDetail(schema: string): Promise<Result<DocumentDetail>>;
  validateOpenApi(schema: string): Promise<Result<ValidationReport>>;
}

export class DocumentRepository implements IDocumentRepository {
  async listDocuments(): Promise<Result<OpenApiDocumentSummary[]>> {
    try {
      return ok(await invokeTauri<OpenApiDocumentSummary[]>('list_documents'));
    } catch (error) {
      return fail<OpenApiDocumentSummary[]>('IPC_ERROR', toErrorMessage(error));
    }
  }

  async getSpecs(schemas: string[]): Promise<Result<OpenApiSpec[]>> {
    try {
      return ok(await invokeTauri<OpenApiSpec[]>('get_openapi_specs', { schemas }));
    } catch (error) {
      return fail<OpenApiSpec[]>('IPC_ERROR', toErrorMessage(error));
    }
  }

  async getDocumentDetail(schema: string): Promise<Result<DocumentDetail>> {
    try {
      return ok(await invokeTauri<DocumentDetail>('get_document_detail', { schema }));
    } catch (error) {
      return fail<DocumentDetail>('IPC_ERROR', toErrorMessage(error));
    }
  }

  async validateOpenApi(schema: string): Promise<Result<ValidationReport>> {
    try {
      return ok(await invokeTauri<ValidationReport>('validate_openapi', { schema }));
    } catch (error) {
      return fail<ValidationReport>('IPC_ERROR', toErrorMessage(error));
    }
  }
}
