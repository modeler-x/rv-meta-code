import type {
  ConnectionDraft,
  ConnectionDto,
  CurrentConnectionDto,
  SaveConnectionInput,
  TestConnectionInput,
  TestConnectionResult
} from '@/modules/connection/dto/ConnectionDto';
import type { IConnectionRepository } from '@/modules/connection/repositories/ConnectionRepository';
import type { Result } from '@/shared/result/Result';

export class ConnectionService {
  constructor(private readonly connectionRepository: IConnectionRepository) {}

  async loadConnections(): Promise<Result<ConnectionDto[]>> {
    return this.connectionRepository.listConnections();
  }

  async saveConnection(input: SaveConnectionInput): Promise<Result<ConnectionDto>> {
    return this.connectionRepository.saveConnection(input);
  }

  async deleteConnection(id: string): Promise<Result<void>> {
    return this.connectionRepository.deleteConnection(id);
  }

  async setActiveConnection(id: string): Promise<Result<void>> {
    return this.connectionRepository.setActiveConnection(id);
  }

  async testConnection(input: TestConnectionInput): Promise<Result<TestConnectionResult>> {
    return this.connectionRepository.testConnection(input);
  }

  async getCurrentConnection(): Promise<Result<CurrentConnectionDto | null>> {
    return this.connectionRepository.getCurrentConnection();
  }

  createDraft(): ConnectionDraft {
    return { id: '', name: '', host: '', port: '5432', database: '', user: '', password: '', isCurrent: false, hasPassword: false, excludedSchemas: [] };
  }

  toDraft(connection: ConnectionDto): ConnectionDraft {
    // 秘匿値はバックエンドから返らないため、編集時の password は空で開始する。
    return { ...connection, password: '', excludedSchemas: connection.excludedSchemas ?? [] };
  }

  isValidDraft(draft: ConnectionDraft): boolean {
    return draft.name.trim().length > 0 && draft.host.trim().length > 0;
  }

  toSaveInput(draft: ConnectionDraft): SaveConnectionInput {
    return {
      id: draft.id.length > 0 ? draft.id : undefined,
      name: draft.name,
      host: draft.host,
      port: draft.port,
      database: draft.database,
      user: draft.user,
      // 空なら既存パスワードを維持する。
      password: draft.password.length > 0 ? draft.password : undefined,
      excludedSchemas: draft.excludedSchemas
    };
  }

  toTestInput(draft: ConnectionDraft): TestConnectionInput {
    return {
      id: draft.id.length > 0 ? draft.id : undefined,
      host: draft.host,
      port: draft.port,
      database: draft.database,
      user: draft.user,
      password: draft.password.length > 0 ? draft.password : undefined
    };
  }
}
