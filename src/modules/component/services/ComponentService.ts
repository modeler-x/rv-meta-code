import type { IComponentRepository } from '@/modules/component/repositories/ComponentRepository';
import type { ComponentSummary } from '@/modules/component/types/ComponentSummary';
import type { ValidationReport } from '@/modules/sdk/types/SdkGeneration';
import type { Result } from '@/shared/result/Result';

export class ComponentService {
  constructor(private readonly componentRepository: IComponentRepository) {}

  async loadComponents(schema: string): Promise<Result<ComponentSummary[]>> {
    return this.componentRepository.listComponents(schema);
  }

  async validateOpenApi(schema: string): Promise<Result<ValidationReport>> {
    return this.componentRepository.validateOpenApi(schema);
  }
}
