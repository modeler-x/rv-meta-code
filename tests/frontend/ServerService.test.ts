import { describe, it, expect } from 'vitest';
import { ServerService } from '@/modules/server/services/ServerService';
import type { IServerRepository } from '@/modules/server/repositories/ServerRepository';
import { ok, type Result } from '@/shared/result/Result';
import type { SaveServerInput, ServerDto, TestServerInput, TestServerResult } from '@/modules/server/dto/ServerDto';

class FakeServerRepository implements IServerRepository {
  async listServers(): Promise<Result<ServerDto[]>> {
    return ok([
      {
        id: 1, name: 'default', environment: 'dev', baseUrl: '/', description: null, variables: null,
        healthPath: null, expectedStatus: 200, timeoutMs: 3000, enabled: true,
        createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z'
      }
    ]);
  }
  async saveServer(input: SaveServerInput): Promise<Result<ServerDto>> {
    return ok({
      id: input.id ?? 2, name: input.name, environment: input.environment, baseUrl: input.baseUrl,
      description: input.description ?? null, variables: (input.variables as Record<string, unknown>) ?? null,
      healthPath: input.healthPath ?? null, expectedStatus: input.expectedStatus, timeoutMs: input.timeoutMs,
      enabled: input.enabled, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z'
    });
  }
  async deleteServer(): Promise<Result<void>> {
    return ok<void>(undefined);
  }
  async testServer(_input: TestServerInput): Promise<Result<TestServerResult>> {
    return ok({ isOk: true, url: 'https://api/health', status: 200, expectedStatus: 200, latencyMs: 12, message: 'OK' });
  }
}

describe('ServerService', () => {
  it('rejects a draft without name or base URL', () => {
    const service = new ServerService(new FakeServerRepository());
    const draft = service.createDraft();
    expect(service.isValidDraft(draft)).toBe(false);
    draft.name = 'prod';
    draft.baseUrl = 'https://api.example.com';
    expect(service.isValidDraft(draft)).toBe(true);
  });

  it('parses variables JSON and reports invalid JSON', () => {
    const service = new ServerService(new FakeServerRepository());
    const empty = service.parseVariables('   ');
    expect(empty.success && empty.data).toBe(null);

    const valid = service.parseVariables('{ "host": { "default": "api" } }');
    expect(valid.success).toBe(true);

    const invalid = service.parseVariables('{ not json');
    expect(invalid.success).toBe(false);
  });

  it('builds save input with parsed variables and omits empty description', () => {
    const service = new ServerService(new FakeServerRepository());
    const draft = service.createDraft();
    draft.name = 'prod';
    draft.baseUrl = 'https://api.example.com';
    const input = service.toSaveInput(draft, { host: { default: 'api' } });
    expect(input.description).toBeUndefined();
    expect(input.variables).toEqual({ host: { default: 'api' } });
    expect(input.enabled).toBe(true);
  });

  it('builds test input from the draft, omitting empty health path', () => {
    const service = new ServerService(new FakeServerRepository());
    const draft = service.createDraft();
    draft.baseUrl = 'https://api.example.com';
    const input = service.toTestInput(draft, null);
    expect(input.healthPath).toBeUndefined();
    expect(input.baseUrl).toBe('https://api.example.com');
    expect(input.expectedStatus).toBe(200);
    expect(input.timeoutMs).toBe(3000);
  });

  it('carries persisted health path, expected status and timeout into test input', () => {
    const service = new ServerService(new FakeServerRepository());
    const draft = service.createDraft();
    draft.baseUrl = 'https://api.example.com';
    draft.healthPath = '/health';
    draft.expectedStatus = 204;
    draft.timeoutMs = 1500;
    const input = service.toTestInput(draft, null);
    expect(input.healthPath).toBe('/health');
    expect(input.expectedStatus).toBe(204);
    expect(input.timeoutMs).toBe(1500);
  });
});
