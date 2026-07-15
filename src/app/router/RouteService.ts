import type { AppRoute, AppRouteName } from '@/app/router/AppRoute';

export class RouteService {
  createRoute(name: AppRouteName): AppRoute {
    return { name };
  }

  createEntityRoute(entityId: string, backRoute: AppRoute = { name: 'entities' }): AppRoute {
    return { name: 'entityDetail', entityId, backRoute };
  }

  createDocumentRoute(documentId: string): AppRoute {
    return { name: 'documentDetail', documentId, backRoute: { name: 'documents' } };
  }

  createOperationRoute(entityId: string, operationRowId: string): AppRoute {
    return { name: 'operationDetail', entityId, operationRowId, backRoute: this.createEntityRoute(entityId) };
  }

  createOperationGroupRoute(schemaName: string, groupKey: string, backRoute: AppRoute): AppRoute {
    return { name: 'operationGroupDetail', schemaName, groupKey, backRoute };
  }

  createFunctionOperationRoute(
    schemaName: string,
    groupKey: string,
    operationRowId: string,
    backRoute: AppRoute
  ): AppRoute {
    return { name: 'functionOperationDetail', schemaName, groupKey, operationRowId, backRoute };
  }

  createSdkGenerationRoute(schemaName: string, backRoute: AppRoute): AppRoute {
    return { name: 'sdkGeneration', schemaName, backRoute };
  }
}
