import { ok, fail, type Result } from '@/shared/result/Result';
import { invokeTauri } from '@/shared/ipc/invokeTauri';
import type {
  ConnectionDto,
  SaveConnectionInput,
  TestConnectionInput,
  TestConnectionResult
} from '@/modules/connection/dto/ConnectionDto';

export interface IConnectionRepository {
  listConnections(): Promise<Result<ConnectionDto[]>>;
  saveConnection(input: SaveConnectionInput): Promise<Result<ConnectionDto>>;
  deleteConnection(id: string): Promise<Result<void>>;
  setActiveConnection(id: string): Promise<Result<void>>;
  testConnection(input: TestConnectionInput): Promise<Result<TestConnectionResult>>;
}

type AppErrorShape = { code?: string; message?: string };

function toErrorResult<T>(error: unknown): Result<T> {
  const shape = error as AppErrorShape | null;
  if (shape && typeof shape.message === 'string') {
    return fail<T>(shape.code ?? 'IPC_ERROR', shape.message);
  }
  return fail<T>('IPC_ERROR', String(error));
}

export class ConnectionRepository implements IConnectionRepository {
  async listConnections(): Promise<Result<ConnectionDto[]>> {
    try {
      return ok(await invokeTauri<ConnectionDto[]>('list_connections'));
    } catch (error) {
      return toErrorResult<ConnectionDto[]>(error);
    }
  }

  async saveConnection(input: SaveConnectionInput): Promise<Result<ConnectionDto>> {
    try {
      return ok(await invokeTauri<ConnectionDto>('save_connection', { request: input }));
    } catch (error) {
      return toErrorResult<ConnectionDto>(error);
    }
  }

  async deleteConnection(id: string): Promise<Result<void>> {
    try {
      await invokeTauri<void>('delete_connection', { id });
      return ok<void>(undefined);
    } catch (error) {
      return toErrorResult<void>(error);
    }
  }

  async setActiveConnection(id: string): Promise<Result<void>> {
    try {
      await invokeTauri<void>('set_active_connection', { id });
      return ok<void>(undefined);
    } catch (error) {
      return toErrorResult<void>(error);
    }
  }

  async testConnection(input: TestConnectionInput): Promise<Result<TestConnectionResult>> {
    try {
      return ok(await invokeTauri<TestConnectionResult>('test_connection', { request: input }));
    } catch (error) {
      return toErrorResult<TestConnectionResult>(error);
    }
  }
}
