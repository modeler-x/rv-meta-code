// rv_meta.openapi_operations の1行（OpenAPI オペレーション）。
// parameters / requestBody / responses は OpenAPI の jsonb をそのまま保持する。

/** OpenAPI parameter object（parameters 配列の要素）。 */
export type OperationParameter = {
  name: string;
  in: string;
  required?: boolean;
  schema?: Record<string, unknown>;
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
  responses: Record<string, { description?: string; content?: unknown }>;
  requiredFields: string[];
};
