import { ok, fail, type Result } from '@/shared/result/Result';
import { invokeTauri } from '@/shared/ipc/invokeTauri';
import type { OpenApiDocumentSummary } from '@/modules/document/types/OpenApiDocumentSummary';

export interface IDocumentRepository {
  listDocuments(): Promise<Result<OpenApiDocumentSummary[]>>;
}

export class DocumentRepository implements IDocumentRepository {
  async listDocuments(): Promise<Result<OpenApiDocumentSummary[]>> {
    try {
      return ok(await invokeTauri<OpenApiDocumentSummary[]>('list_documents'));
    } catch (error) {
      const shape = error as { message?: string } | null;
      return fail<OpenApiDocumentSummary[]>(
        'IPC_ERROR',
        shape && typeof shape.message === 'string' ? shape.message : String(error)
      );
    }
  }
}
