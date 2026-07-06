import { describe, expect, it } from 'vitest';
import { ok, type Result } from '@/shared/result/Result';
import { ConnectionService } from '@/modules/connection/services/ConnectionService';
import type { IConnectionRepository } from '@/modules/connection/repositories/ConnectionRepository';
import type {
  ConnectionDto,
  SaveConnectionInput,
  TestConnectionInput,
  TestConnectionResult
} from '@/modules/connection/dto/ConnectionDto';

class FakeConnectionRepository implements IConnectionRepository {
  savedInputs: SaveConnectionInput[] = [];

  async listConnections(): Promise<Result<ConnectionDto[]>> {
    return ok([
      { id: 'c1', name: 'Local', host: 'localhost', port: '5432', database: 'appdb', user: 'postgres', isCurrent: true, hasPassword: true }
    ]);
  }

  async saveConnection(input: SaveConnectionInput): Promise<Result<ConnectionDto>> {
    this.savedInputs.push(input);
    return ok({ id: input.id ?? 'new', name: input.name, host: input.host, port: input.port, database: input.database, user: input.user, isCurrent: true, hasPassword: Boolean(input.password) });
  }

  async deleteConnection(): Promise<Result<void>> {
    return ok<void>(undefined);
  }

  async setActiveConnection(): Promise<Result<void>> {
    return ok<void>(undefined);
  }

  async testConnection(_input: TestConnectionInput): Promise<Result<TestConnectionResult>> {
    return ok({ isOk: true, message: 'connection succeeded', serverVersion: 'PostgreSQL 16' });
  }
}

describe('ConnectionService', () => {
  it('loads connections from the repository', async () => {
    const service = new ConnectionService(new FakeConnectionRepository());
    const result = await service.loadConnections();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].name).toBe('Local');
    }
  });

  it('rejects a draft without name or host', () => {
    const service = new ConnectionService(new FakeConnectionRepository());
    const draft = service.createDraft();
    expect(service.isValidDraft(draft)).toBe(false);
    draft.name = 'Prod';
    draft.host = 'db.internal';
    expect(service.isValidDraft(draft)).toBe(true);
  });

  it('omits an empty password so the stored secret is kept on save', () => {
    const service = new ConnectionService(new FakeConnectionRepository());
    const draft = service.createDraft();
    draft.id = 'c1';
    draft.name = 'Prod';
    draft.host = 'db.internal';
    const input = service.toSaveInput(draft);
    expect(input.id).toBe('c1');
    expect(input.password).toBeUndefined();
  });

  it('forwards a non-empty password on save', () => {
    const service = new ConnectionService(new FakeConnectionRepository());
    const draft = service.createDraft();
    draft.name = 'Prod';
    draft.host = 'db.internal';
    draft.password = 'secret';
    const input = service.toSaveInput(draft);
    expect(input.id).toBeUndefined();
    expect(input.password).toBe('secret');
  });
});
