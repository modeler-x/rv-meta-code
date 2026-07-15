export type AppRouteName =
  | 'welcome'
  | 'schema'
  | 'documents'
  | 'documentDetail'
  | 'entities'
  | 'entityDetail'
  | 'operationDetail'
  | 'operationGroupDetail'
  | 'functionOperationDetail'
  | 'sdkGeneration'
  | 'components'
  | 'recent'
  | 'profile'
  | 'connections'
  | 'servers';

export type AppRoute = {
  name: AppRouteName;
  documentId?: string;
  entityId?: string;
  // openapi_operations.id（DB 内部整数ID）の文字列。OpenAPI の operationId とは別物。
  operationRowId?: string;
  // Operation Group / Function Operation の識別に使う。
  schemaName?: string;
  groupKey?: string;
  backRoute?: AppRoute;
};
