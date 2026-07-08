import { ok, fail, type Result } from '@/shared/result/Result';
import { invokeTauri } from '@/shared/ipc/invokeTauri';
import type { OpenApiDocumentSummary } from '@/modules/document/types/OpenApiDocumentSummary';
import type { OpenApiSpec } from '@/modules/document/types/OpenApiSpec';

function toErrorMessage(error: unknown): string {
  const shape = error as { message?: string } | null;
  return shape && typeof shape.message === 'string' ? shape.message : String(error);
}

export interface IDocumentRepository {
  listDocuments(): Promise<Result<OpenApiDocumentSummary[]>>;
  getSpecs(schemas: string[]): Promise<Result<OpenApiSpec[]>>;
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
}
