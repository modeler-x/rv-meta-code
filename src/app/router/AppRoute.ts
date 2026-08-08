export type AppRouteName =
  | 'welcome'
  | 'schema'
  | 'manifest'
  | 'manifestOperations'
  | 'documents'
  | 'documentDetail'
  | 'entities'
  | 'entityDetail'
  | 'functions'
  | 'operationDetail'
  | 'operationGroupDetail'
  | 'functionOperationDetail'
  | 'sdkGeneration'
  | 'sdkList'
  | 'components'
  | 'recent'
  | 'help'
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
  /** オペレーションの初期フィルター。マニフェストの診断から飛んだときに使う。 */
  functionKey?: string;
  /** ヘルプの初期ページ。編集画面から書式へ飛ぶときに使う。 */
  helpPage?: string;
  /**
   * 契約面。ドキュメント・SDK・components は (schema, profile) で一意なので、
   * 遷移のたびに持ち回る。既定値を置かないのは、指定し忘れが黙って内部契約を
   * 拾うのを防ぐため。
   */
  profile?: string;
  backRoute?: AppRoute;
};
