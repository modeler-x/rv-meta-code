// OpenAPI components の1件（参照ブラウザ用、rv_meta.openapi_components + 生成結果由来）。
export type ComponentSummary = {
  // 'schemas' | 'responses' | 'securitySchemes'
  section: string;
  name: string;
  // 'template'（全体テンプレート）| 'document'（Document固有Override）| 'generated'（Entity Schema等）
  scope: string;
  enabled: boolean;
  // 最終 OpenAPI の components に出力されるか。
  emitted: boolean;
  definition: Record<string, unknown>;
};
