import type { OperationSummary } from '@/modules/operation/types/OperationSummary';

// rv_meta.openapi_entities の1行（フィールド数/オペレーション数つき）。
export type EntitySummary = {
  id: number;
  tableSchema: string;
  tableName: string;
  resourceName: string;
  description: string | null;
  fieldCount: number;
  operationCount: number;
};

// rv_meta.openapi_fields の1行。
export type EntityField = {
  id: number;
  columnName: string;
  ordinalPosition: number;
  jsonSchema: Record<string, unknown>;
  required: boolean;
  isPrimaryKey: boolean;
  isReadOnly: boolean;
  description: string | null;
};

// テーブル(エンティティ)詳細＝フィールド一覧＋オペレーション一覧。
export type EntityDetail = {
  fields: EntityField[];
  operations: OperationSummary[];
};
