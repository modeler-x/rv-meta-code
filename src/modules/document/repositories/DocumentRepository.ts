import { ok, type Result } from '@/shared/result/Result';
import type { OpenApiDocumentSummary } from '@/modules/document/types/OpenApiDocumentSummary';

export interface IDocumentRepository {
  listDocuments(): Promise<Result<OpenApiDocumentSummary[]>>;
}

export class DocumentRepository implements IDocumentRepository {
  async listDocuments(): Promise<Result<OpenApiDocumentSummary[]>> {
    return ok([
      { id: 'accounts', name: 'Accounts API', version: 'v1.0.0', description: 'Identity and tenant surface.', entityIds: ['users', 'organizations'] },
      { id: 'catalog', name: 'Catalog API', version: 'v1.2.0', description: 'Product catalogue and pricing.', entityIds: ['products'] },
      { id: 'orders', name: 'Orders API', version: 'v0.9.0', description: 'Checkout lifecycle and reporting views.', entityIds: ['orders', 'active_users', 'revenue_by_day'] }
    ]);
  }
}
