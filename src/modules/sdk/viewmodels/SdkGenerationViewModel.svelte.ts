import type { SdkGenerationService } from '@/modules/sdk/services/SdkGenerationService';
import type {
  GenerateSdkResult,
  SdkGenerationForm,
  SdkGenerationPhase,
  ValidationReport
} from '@/modules/sdk/types/SdkGeneration';

export class SdkGenerationViewModel {
  generatorId = $state('openapi-generator-cli');
  language = $state('typescript-fetch');
  packageName = $state('rv-sdk');
  packageVersion = $state('1.0.0');
  outputDirectory = $state('');

  phase: SdkGenerationPhase = $state('idle');
  report: ValidationReport | null = $state(null);
  result: GenerateSdkResult | null = $state(null);
  errorMessage: string | null = $state(null);
  errorCode: string | null = $state(null);

  constructor(private readonly sdkGenerationService: SdkGenerationService) {}

  get isRunning(): boolean {
    return this.phase === 'running';
  }

  get canRun(): boolean {
    return (
      this.packageName.trim() !== '' &&
      this.outputDirectory.trim() !== '' &&
      this.language.trim() !== ''
    );
  }

  /** 固定処理順で実行する: 取得 → 検証 → 成功時のみ生成 → 結果反映。 */
  async run(schema: string): Promise<void> {
    if (!this.canRun || this.isRunning) return;
    this.phase = 'running';
    this.report = null;
    this.result = null;
    this.errorMessage = null;
    this.errorCode = null;

    const form: SdkGenerationForm = {
      generatorId: this.generatorId,
      language: this.language,
      packageName: this.packageName,
      packageVersion: this.packageVersion,
      outputDirectory: this.outputDirectory
    };

    const outcome = await this.sdkGenerationService.runGeneration(schema, form);
    if (!outcome.success) {
      this.phase = 'error';
      this.errorCode = outcome.error.code;
      this.errorMessage = outcome.error.message;
      return;
    }
    if (outcome.data.kind === 'invalid') {
      this.report = outcome.data.report;
      this.phase = 'invalid';
    } else {
      this.report = outcome.data.report;
      this.result = outcome.data.result;
      this.phase = 'done';
    }
  }

  reset(): void {
    this.phase = 'idle';
    this.report = null;
    this.result = null;
    this.errorMessage = null;
    this.errorCode = null;
  }
}
