import { ok, fail, type Result } from '@/shared/result/Result';
import { invokeTauri } from '@/shared/ipc/invokeTauri';
import { toIpcErrorMessage } from '@/shared/ipc/toIpcErrorMessage';
import type { ComponentSummary } from '@/modules/component/types/ComponentSummary';
import type { ValidationReport } from '@/modules/sdk/types/SdkGeneration';

export interface IComponentRepository {
  listComponents(schema: string): Promise<Result<ComponentSummary[]>>;
  validateOpenApi(schema: string): Promise<Result<ValidationReport>>;
}

export class ComponentRepository implements IComponentRepository {
  async listComponents(schema: string): Promise<Result<ComponentSummary[]>> {
    try {
      return ok(await invokeTauri<ComponentSummary[]>('list_components', { schema }));
    } catch (error) {
      return fail<ComponentSummary[]>('IPC_ERROR', toIpcErrorMessage(error));
    }
  }

  async validateOpenApi(schema: string): Promise<Result<ValidationReport>> {
    try {
      return ok(await invokeTauri<ValidationReport>('validate_openapi', { schema }));
    } catch (error) {
      return fail<ValidationReport>('IPC_ERROR', toIpcErrorMessage(error));
    }
  }
}
