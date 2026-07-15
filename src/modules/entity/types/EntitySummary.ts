import type { OpenApiComponents, OperationSummary } from '@/modules/operation/types/OperationSummary';

// rv_meta.openapi_entities の1行（フィールド数/オペレーション数つき）。
export type EntitySummary = {
  id: number;
  tableSchema: string;
  tableName: string;
  resourceName: string;
  description: string | null;
  fieldCount: number;
  operationCount: number;
  // 参照専用ポリシー（true なら list/get のみ）。
  isReadOnly: boolean;
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

// FK リレーション（openapi_relations）。エンティティ視点で outgoing / incoming。
export type EntityRelation = {
  constraintName: string;
  direction: 'outgoing' | 'incoming';
  relationKind: string;
  fromSchema: string | null;
  fromTable: string | null;
  fromColumns: string[];
  toTableSchema: string;
  toTableName: string;
  toColumns: string[];
};

// テーブル(エンティティ)詳細＝フィールド一覧＋オペレーション一覧＋リレーション＋$ref 解決用 components。
export type EntityDetail = {
  fields: EntityField[];
  operations: OperationSummary[];
  relations: EntityRelation[];
  components: OpenApiComponents;
};
