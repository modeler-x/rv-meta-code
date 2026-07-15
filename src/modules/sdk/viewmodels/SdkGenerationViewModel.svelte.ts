import type { SdkGenerationService } from '@/modules/sdk/services/SdkGenerationService';
import type {
  GenerateSdkResult,
  SdkGenerationForm,
  SdkGenerationPhase,
  ValidationReport
} from '@/modules/sdk/types/SdkGeneration';

const OUTPUT_DIR_KEY = 'rv_sdk_output_directory';

function loadOutputDirectory(): string {
  try {
    if (typeof localStorage === 'undefined') return '';
    return localStorage.getItem(OUTPUT_DIR_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveOutputDirectory(directory: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(OUTPUT_DIR_KEY, directory);
  } catch {
    // 保存失敗は握りつぶす（設定値の記憶）。
  }
}

export class SdkGenerationViewModel {
  generatorId = $state('openapi-generator-cli');
  language = $state('typescript-fetch');
  packageName = $state('rv-sdk');
  packageVersion = $state('1.0.0');
  // 前回選択したフォルダーを端末に記憶して復元する。
  outputDirectory = $state(loadOutputDirectory());

  phase: SdkGenerationPhase = $state('idle');
  report: ValidationReport | null = $state(null);
  result: GenerateSdkResult | null = $state(null);
  errorMessage: string | null = $state(null);
  errorCode: string | null = $state(null);

  constructor(private readonly sdkGenerationService: SdkGenerationService) {}

  /** OS のフォルダー選択ダイアログを開き、選択されたら出力先へ反映・記憶する。 */
  async pickOutputDirectory(): Promise<void> {
    const result = await this.sdkGenerationService.pickOutputDirectory(this.outputDirectory);
    if (result.success && result.data) {
      this.outputDirectory = result.data;
      saveOutputDirectory(this.outputDirectory);
    }
  }

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
    // 手入力の出力先も記憶する。
    saveOutputDirectory(this.outputDirectory);
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
