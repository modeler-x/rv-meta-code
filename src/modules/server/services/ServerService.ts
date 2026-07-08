import type {
  SaveServerInput,
  ServerDraft,
  ServerDto,
  TestServerInput,
  TestServerResult
} from '@/modules/server/dto/ServerDto';
import type { IServerRepository } from '@/modules/server/repositories/ServerRepository';
import { ok, fail, type Result } from '@/shared/result/Result';

export class ServerService {
  constructor(private readonly serverRepository: IServerRepository) {}

  async loadServers(): Promise<Result<ServerDto[]>> {
    return this.serverRepository.listServers();
  }

  async saveServer(input: SaveServerInput): Promise<Result<ServerDto>> {
    return this.serverRepository.saveServer(input);
  }

  async deleteServer(id: number): Promise<Result<void>> {
    return this.serverRepository.deleteServer(id);
  }

  async testServer(input: TestServerInput): Promise<Result<TestServerResult>> {
    return this.serverRepository.testServer(input);
  }

  createDraft(): ServerDraft {
    return {
      id: null,
      name: '',
      environment: 'dev',
      baseUrl: '',
      description: '',
      variablesText: '',
      healthPath: '',
      expectedStatus: 200,
      timeoutMs: 3000,
      enabled: true
    };
  }

  toDraft(server: ServerDto): ServerDraft {
    return {
      id: server.id,
      name: server.name,
      environment: server.environment,
      baseUrl: server.baseUrl,
      description: server.description ?? '',
      variablesText: server.variables ? JSON.stringify(server.variables, null, 2) : '',
      healthPath: server.healthPath ?? '',
      expectedStatus: server.expectedStatus,
      timeoutMs: server.timeoutMs,
      enabled: server.enabled
    };
  }

  isValidDraft(draft: ServerDraft): boolean {
    return draft.name.trim().length > 0 && draft.baseUrl.trim().length > 0;
  }

  /** variables テキストを JSON として解釈する。空なら null、不正なら error を返す。 */
  parseVariables(variablesText: string): Result<unknown | null> {
    const text = variablesText.trim();
    if (text.length === 0) return ok(null);
    try {
      return ok(JSON.parse(text));
    } catch {
      return fail('INVALID_JSON', 'variables must be valid JSON');
    }
  }

  toSaveInput(draft: ServerDraft, variables: unknown | null): SaveServerInput {
    return {
      id: draft.id ?? undefined,
      name: draft.name,
      environment: draft.environment,
      baseUrl: draft.baseUrl,
      description: draft.description.length > 0 ? draft.description : undefined,
      variables: variables ?? undefined,
      healthPath: draft.healthPath.length > 0 ? draft.healthPath : undefined,
      expectedStatus: draft.expectedStatus,
      timeoutMs: draft.timeoutMs,
      enabled: draft.enabled
    };
  }

  toTestInput(draft: ServerDraft, variables: unknown | null, baseUrlOverride: string): TestServerInput {
    return {
      baseUrl: draft.baseUrl,
      variables: variables ?? undefined,
      healthPath: draft.healthPath.length > 0 ? draft.healthPath : undefined,
      baseUrlOverride: baseUrlOverride.length > 0 ? baseUrlOverride : undefined,
      expectedStatus: draft.expectedStatus,
      timeoutMs: draft.timeoutMs
    };
  }
}
