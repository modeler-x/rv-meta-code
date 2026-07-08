// OpenAPI ドキュメント一覧の1行（rv_meta.openapi_documents 由来）。
export type OpenApiDocumentSummary = {
  id: number;
  schemaName: string;
  title: string;
  version: string;
  description: string | null;
  /** UTC ISO8601 文字列。相対表記はフロントで整形する。 */
  updatedAt: string;
};
