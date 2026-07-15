import { describe, it, expect } from 'vitest';
import { SdkGenerationService } from '@/modules/sdk/services/SdkGenerationService';
import { SdkGenerationViewModel } from '@/modules/sdk/viewmodels/SdkGenerationViewModel.svelte';
import type { ISdkGenerationRepository } from '@/modules/sdk/repositories/SdkGenerationRepository';
import { ok, fail, type Result } from '@/shared/result/Result';
import type {
  GenerateSdkRequest,
  GenerateSdkResult,
  OpenApiDocument,
  ValidationReport
} from '@/modules/sdk/types/SdkGeneration';

const form = {
  generatorId: 'openapi-generator-cli',
  language: 'typescript-fetch',
  packageName: 'rv-sdk',
  packageVersion: '1.0.0',
  outputDirectory: '/tmp/out'
};

const validReport: ValidationReport = { isValid: true, errors: [], warnings: [] };
const invalidReport: ValidationReport = {
  isValid: false,
  errors: [{ pointer: '/openapi', rule: 'structure.openapi', message: 'missing openapi version' }],
  warnings: []
};

class FakeRepo implements ISdkGenerationRepository {
  generateCalls = 0;
  constructor(
    private readonly report: ValidationReport,
    private readonly generateResult: Result<GenerateSdkResult> = ok({
      generatorId: 'openapi-generator-cli',
      outputDirectory: '/tmp/out',
      generatedFiles: ['api.ts'],
      warnings: [],
      durationMs: 12
    })
  ) {}
  async getOpenApiDocument(): Promise<Result<OpenApiDocument>> {
    return ok({ openapi: '3.0.3' });
  }
  async validateOpenApi(): Promise<Result<ValidationReport>> {
    return ok(this.report);
  }
  async generateSdk(_request: GenerateSdkRequest): Promise<Result<GenerateSdkResult>> {
    this.generateCalls += 1;
    return this.generateResult;
  }
  async pickOutputDirectory(_current: string): Promise<Result<string | null>> {
    return ok('/picked/dir');
  }
}

describe('SdkGenerationService', () => {
  it('does not generate when the OpenAPI document is invalid', async () => {
    const repo = new FakeRepo(invalidReport);
    const outcome = await new SdkGenerationService(repo).runGeneration('rv_auth', form);
    expect(outcome.success).toBe(true);
    if (outcome.success) expect(outcome.data.kind).toBe('invalid');
    expect(repo.generateCalls).toBe(0);
  });

  it('generates when valid and returns the result', async () => {
    const repo = new FakeRepo(validReport);
    const outcome = await new SdkGenerationService(repo).runGeneration('rv_auth', form);
    expect(outcome.success).toBe(true);
    if (outcome.success && outcome.data.kind === 'generated') {
      expect(outcome.data.result.generatedFiles).toEqual(['api.ts']);
    } else {
      throw new Error('expected generated outcome');
    }
    expect(repo.generateCalls).toBe(1);
  });

  it('propagates a generator error (e.g. GENERATOR_NOT_AVAILABLE)', async () => {
    const repo = new FakeRepo(validReport, fail('GENERATOR_NOT_AVAILABLE', 'openapi-generator-cli not found'));
    const outcome = await new SdkGenerationService(repo).runGeneration('rv_auth', form);
    expect(outcome.success).toBe(false);
    if (!outcome.success) expect(outcome.error.code).toBe('GENERATOR_NOT_AVAILABLE');
  });
});

describe('SdkGenerationViewModel phases', () => {
  it('goes to invalid phase without generating', async () => {
    const vm = new SdkGenerationViewModel(new SdkGenerationService(new FakeRepo(invalidReport)));
    vm.outputDirectory = '/tmp/out';
    await vm.run('rv_auth');
    expect(vm.phase).toBe('invalid');
    expect(vm.report?.isValid).toBe(false);
    expect(vm.result).toBeNull();
  });

  it('goes to done phase with a result on success', async () => {
    const vm = new SdkGenerationViewModel(new SdkGenerationService(new FakeRepo(validReport)));
    vm.outputDirectory = '/tmp/out';
    await vm.run('rv_auth');
    expect(vm.phase).toBe('done');
    expect(vm.result?.generatedFiles).toEqual(['api.ts']);
  });

  it('goes to error phase and keeps the error code on generator failure', async () => {
    const vm = new SdkGenerationViewModel(
      new SdkGenerationService(new FakeRepo(validReport, fail('GENERATOR_NOT_AVAILABLE', 'not found')))
    );
    vm.outputDirectory = '/tmp/out';
    await vm.run('rv_auth');
    expect(vm.phase).toBe('error');
    expect(vm.errorCode).toBe('GENERATOR_NOT_AVAILABLE');
  });
});
