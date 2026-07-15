// rv_meta.openapi_documents 詳細（件数・割当Server・Root Security・定義元判別用 annotation）。
export type DocumentDetail = {
  id: number;
  schemaName: string;
  title: string;
  version: string;
  description: string | null;
  generationMode: string;
  /** UTC ISO8601（最終 compile 日時）。 */
  updatedAt: string;
  entityOperationCount: number;
  functionOperationCount: number;
  operationGroupCount: number;
  componentCount: number;
  servers: { url?: string; description?: string }[];
  rootSecurity: Record<string, string[]>[];
  // @openapi-document 宣言（未宣言なら null）。定義元表示に使う。
  annotation: Record<string, unknown> | null;
};
