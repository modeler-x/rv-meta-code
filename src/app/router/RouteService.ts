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

  createOperationRoute(entityId: string, operationId: string): AppRoute {
    return { name: 'operationDetail', entityId, operationId, backRoute: this.createEntityRoute(entityId) };
  }
}
