import { ok, fail, type Result } from '@/shared/result/Result';
import { invokeTauri } from '@/shared/ipc/invokeTauri';
import type { SaveServerInput, ServerDto, TestServerInput, TestServerResult } from '@/modules/server/dto/ServerDto';

export interface IServerRepository {
  listServers(): Promise<Result<ServerDto[]>>;
  saveServer(input: SaveServerInput): Promise<Result<ServerDto>>;
  deleteServer(id: number): Promise<Result<void>>;
  testServer(input: TestServerInput): Promise<Result<TestServerResult>>;
}

type AppErrorShape = { code?: string; message?: string };

function toErrorResult<T>(error: unknown): Result<T> {
  const shape = error as AppErrorShape | null;
  if (shape && typeof shape.message === 'string') {
    return fail<T>(shape.code ?? 'IPC_ERROR', shape.message);
  }
  return fail<T>('IPC_ERROR', String(error));
}

export class ServerRepository implements IServerRepository {
  async listServers(): Promise<Result<ServerDto[]>> {
    try {
      return ok(await invokeTauri<ServerDto[]>('list_servers'));
    } catch (error) {
      return toErrorResult<ServerDto[]>(error);
    }
  }

  async saveServer(input: SaveServerInput): Promise<Result<ServerDto>> {
    try {
      return ok(await invokeTauri<ServerDto>('save_server', { request: input }));
    } catch (error) {
      return toErrorResult<ServerDto>(error);
    }
  }

  async deleteServer(id: number): Promise<Result<void>> {
    try {
      await invokeTauri<void>('delete_server', { id });
      return ok<void>(undefined);
    } catch (error) {
      return toErrorResult<void>(error);
    }
  }

  async testServer(input: TestServerInput): Promise<Result<TestServerResult>> {
    try {
      return ok(await invokeTauri<TestServerResult>('test_server', { request: input }));
    } catch (error) {
      return toErrorResult<TestServerResult>(error);
    }
  }
}
