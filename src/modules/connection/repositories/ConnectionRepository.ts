import { ok, type Result } from '@/shared/result/Result';
import type { ConnectionDto } from '@/modules/connection/dto/ConnectionDto';

export interface IConnectionRepository {
  listConnections(): Promise<Result<ConnectionDto[]>>;
}

export class ConnectionRepository implements IConnectionRepository {
  async listConnections(): Promise<Result<ConnectionDto[]>> {
    return ok([
      { id: 'c1', name: 'Production', host: 'db.prod.internal', port: '5432', database: 'shopdb', user: 'app_ro', isCurrent: true },
      { id: 'c2', name: 'Staging', host: 'db.staging.internal', port: '5432', database: 'shopdb_stg', user: 'app_rw', isCurrent: false },
      { id: 'c3', name: 'Local', host: 'localhost', port: '5432', database: 'shopdb', user: 'postgres', isCurrent: false }
    ]);
  }
}
