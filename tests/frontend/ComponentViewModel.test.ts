import { describe, it, expect } from 'vitest';
import { ComponentViewModel } from '@/modules/component/viewmodels/ComponentViewModel.svelte';
import { ComponentService } from '@/modules/component/services/ComponentService';
import type { IComponentRepository } from '@/modules/component/repositories/ComponentRepository';
import { ok, type Result } from '@/shared/result/Result';
import type { ComponentSummary } from '@/modules/component/types/ComponentSummary';
import type { ValidationReport } from '@/modules/sdk/types/SdkGeneration';

class FakeComponentRepo implements IComponentRepository {
  async listComponents(): Promise<Result<ComponentSummary[]>> {
    return ok([
      { section: 'schemas', name: 'Error', scope: 'template', enabled: true, emitted: true, definition: { type: 'object' } },
      { section: 'securitySchemes', name: 'bearerAuth', scope: 'template', enabled: false, emitted: true, definition: { type: 'http', scheme: 'bearer' } },
      { section: 'securitySchemes', name: 'apiKeyAuth', scope: 'template', enabled: false, emitted: false, definition: { type: 'apiKey' } }
    ]);
  }
  async validateOpenApi(): Promise<Result<ValidationReport>> {
    return ok({
      isValid: false,
      errors: [
        { pointer: '/paths/~1x/get/security', rule: 'securityScheme.undefined', message: 'undefined ghost' },
        { pointer: '/info/title', rule: 'structure.info', message: 'unrelated' }
      ],
      warnings: []
    });
  }
}

describe('ComponentViewModel', () => {
  it('loads components and keeps only component-related validation issues', async () => {
    const vm = new ComponentViewModel(new ComponentService(new FakeComponentRepo()));
    await vm.load('rv_auth');
    expect(vm.components).toHaveLength(3);
    // securitySchemes を section で引ける。
    expect(vm.bySection('securitySchemes').map((c) => c.name)).toEqual(['bearerAuth', 'apiKeyAuth']);
    // 未出力（emitted=false）が判別できる。
    expect(vm.bySection('securitySchemes').find((c) => c.name === 'apiKeyAuth')?.emitted).toBe(false);
    // ref/security 以外の検証は除外される。
    expect(vm.issues).toHaveLength(1);
    expect(vm.issues[0].rule).toBe('securityScheme.undefined');
  });
});
