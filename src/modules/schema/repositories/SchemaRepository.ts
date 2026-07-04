import { ok, type Result } from '@/shared/result/Result';
import type { SchemaSummary } from '@/modules/schema/types/SchemaSummary';

export interface ISchemaRepository {
  listSchemas(): Promise<Result<SchemaSummary[]>>;
}

export class SchemaRepository implements ISchemaRepository {
  async listSchemas(): Promise<Result<SchemaSummary[]>> {
    return ok([
      { key: 'public', name: 'public', tableCount: 4, viewCount: 2, operationCount: 26, documentId: 'accounts', documentName: 'Commerce API', description: 'コア業務スキーマ - アカウント・カタログ・注文。', lastGeneratedLabel: '2 日前に生成' },
      { key: 'auth', name: 'auth', tableCount: 3, viewCount: 0, operationCount: 12, documentId: 'accounts', documentName: 'Auth API', description: '認証・セッション・API トークン。', lastGeneratedLabel: '5 日前に生成' },
      { key: 'analytics', name: 'analytics', tableCount: 0, viewCount: 2, operationCount: 4, documentId: 'orders', documentName: 'Analytics API', description: '売上・活動のレポートビュー。', lastGeneratedLabel: '未生成' },
      { key: 'legacy', name: 'legacy', tableCount: 0, viewCount: 0, operationCount: 0, documentId: null, documentName: '-', description: '非推奨スキーマ。', lastGeneratedLabel: '空' }
    ]);
  }
}
