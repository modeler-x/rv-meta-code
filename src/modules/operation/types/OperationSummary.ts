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

export type OperationSummary = {
  id: number;
  entityId: number;
  operation: string;
  method: string;
  path: string;
  summary: string | null;
  description: string | null;
  parameters: OperationParameter[];
  requestBody: Record<string, unknown> | null;
  responses: Record<string, OperationResponse>;
  requiredFields: string[];
};
