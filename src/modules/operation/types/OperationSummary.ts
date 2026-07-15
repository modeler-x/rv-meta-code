// rv_meta.openapi_operations の1行（OpenAPI オペレーション）。
// parameters / requestBody / responses は OpenAPI の jsonb をそのまま保持する。

/** OpenAPI parameter object（parameters 配列の要素）。in='header' はリクエストヘッダー。 */
export type OperationParameter = {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: Record<string, unknown>;
};

/** OpenAPI header object（response.headers の値）。 */
export type OpenApiHeader = {
  description?: string;
  required?: boolean;
  schema?: Record<string, unknown>;
};

/** OpenAPI response object。$ref の場合は共通レスポンス（components.responses）への参照。 */
export type OperationResponse = {
  $ref?: string;
  description?: string;
  content?: unknown;
  headers?: Record<string, OpenApiHeader>;
};

/** components オブジェクト（$ref 解決に使う。schemas / responses / securitySchemes）。 */
export type OpenApiComponents = {
  schemas?: Record<string, Record<string, unknown>>;
  responses?: Record<string, OperationResponse>;
  securitySchemes?: Record<string, Record<string, unknown>>;
};

/** OpenAPI Security Requirement Object（scheme 名 → scope 配列）。 */
export type SecurityRequirement = Record<string, string[]>;

// Entity Operation と Function Operation の共通モデル。
// id は operationRowId（DB内部整数ID）、operationId は OpenAPI 文字列ID。混同しない。
// entityId と operationGroupId は同時に設定しない（ownerKind で所有者を示す）。
export type OperationSummary = {
  id: number;
  operationId: string;
  ownerKind: 'entity' | 'operationGroup';
  entityId: number | null;
  operationGroupId: number | null;
  operation: string;
  method: string;
  path: string;
  tags: string[];
  // DB 保存の Operation 固有 security。null は Root 継承、[] は認証不要。
  security: SecurityRequirement[] | null;
  summary: string | null;
  description: string | null;
  parameters: OperationParameter[];
  requestBody: Record<string, unknown> | null;
  responses: Record<string, OperationResponse>;
  requiredFields: string[];
  // Root security を合成した実効 security（表示・検証用）。
  effectiveSecurity: SecurityRequirement[];
  securitySource: 'root' | 'operation' | 'public';
};
