// OpenAPI ドキュメント一覧の1行（rv_meta.openapi_documents 由来）。
export type OpenApiDocumentSummary = {
  id: number;
  schemaName: string;
  /**
   * 契約面。1 スキーマが postgrest と bff を持つので、行は (schema, profile) で一意。
   * postgrest は PostgREST が実際に受ける形、bff は外部へ公開する形。
   */
  profile: string;
  title: string;
  version: string;
  description: string | null;
  /** UTC ISO8601 文字列。相対表記はフロントで整形する。 */
  updatedAt: string;
};
