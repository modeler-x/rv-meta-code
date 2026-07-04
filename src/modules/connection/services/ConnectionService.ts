import type { ConnectionDto } from '@/modules/connection/dto/ConnectionDto';
import type { IConnectionRepository } from '@/modules/connection/repositories/ConnectionRepository';
import type { Result } from '@/shared/result/Result';

export class ConnectionService {
  constructor(private readonly connectionRepository: IConnectionRepository) {}

  async loadConnections(): Promise<Result<ConnectionDto[]>> {
    return this.connectionRepository.listConnections();
  }

  createDraft(): ConnectionDto {
    return { id: '', name: '', host: '', port: '5432', database: '', user: '', isCurrent: false };
  }

  isValidDraft(draft: ConnectionDto): boolean {
    return draft.name.trim().length > 0 && draft.host.trim().length > 0;
  }

  upsertConnection(connections: ConnectionDto[], draft: ConnectionDto): ConnectionDto[] {
    if (draft.id) {
      return connections.map((connection) => (connection.id === draft.id ? { ...draft } : connection));
    }
    const created: ConnectionDto = { ...draft, id: `c${Date.now()}`, isCurrent: connections.length === 0 };
    return [...connections, created];
  }

  removeConnection(connections: ConnectionDto[], connectionId: string): ConnectionDto[] {
    const remaining = connections.filter((connection) => connection.id !== connectionId);
    if (remaining.length > 0 && !remaining.some((connection) => connection.isCurrent)) {
      return remaining.map((connection, index) => ({ ...connection, isCurrent: index === 0 }));
    }
    return remaining;
  }

  activateConnection(connections: ConnectionDto[], connectionId: string): ConnectionDto[] {
    return connections.map((connection) => ({ ...connection, isCurrent: connection.id === connectionId }));
  }
}
