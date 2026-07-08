export type AppRouteName =
  | 'welcome'
  | 'schema'
  | 'documents'
  | 'documentDetail'
  | 'entities'
  | 'entityDetail'
  | 'operationDetail'
  | 'recent'
  | 'profile'
  | 'connections'
  | 'servers';

export type AppRoute = {
  name: AppRouteName;
  documentId?: string;
  entityId?: string;
  operationId?: string;
  backRoute?: AppRoute;
};
