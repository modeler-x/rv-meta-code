import type { OpenApiComponents, OperationSummary } from '@/modules/operation/types/OperationSummary';

// rv_meta.openapi_operation_groups の1行（Operation 件数つき）。
export type OperationGroupSummary = {
  id: number;
  documentId: number;
  schemaName: string;
  groupKey: string;
  displayName: string;
  description: string | null;
  operationCount: number;
};

// Operation Group 詳細＝Group メタ＋Operation 一覧（共通 OperationSummary）＋$ref 解決用 components。
export type OperationGroupDetail = {
  operationGroup: OperationGroupSummary;
  operations: OperationSummary[];
  components: OpenApiComponents;
};
