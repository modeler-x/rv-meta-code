import type { SdkGenerationService } from '@/modules/sdk/services/SdkGenerationService';
import type {
  GenerateSdkResult,
  GeneratorDescriptor,
  GeneratorTargetDescriptor,
  SdkGenerationForm,
  SdkGenerationPhase,
  SdkGenerationProfile,
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
  generatorName = $state('typescript-fetch');
  packageName = $state('rv-sdk');
  packageVersion = $state('1.0.0');
  // 前回選択したフォルダーを端末に記憶して復元する。
  outputDirectory = $state(loadOutputDirectory());

  // Registry から取得した Adapter 一覧（UI は固定配列を持たない）。
  generators: GeneratorDescriptor[] = $state([]);
  // 保存済み Profile 一覧。
  profiles: SdkGenerationProfile[] = $state([]);
  selectedProfileName = $state('');
  profileError: string | null = $state(null);

  phase: SdkGenerationPhase = $state('idle');
  report: ValidationReport | null = $state(null);
  result: GenerateSdkResult | null = $state(null);
  errorMessage: string | null = $state(null);
  errorCode: string | null = $state(null);
  // フォルダー選択ダイアログの失敗理由（無反応に見えないよう UI へ表示する）。
  pickError: string | null = $state(null);

  constructor(private readonly sdkGenerationService: SdkGenerationService) {}

  /** 現在選択中の Adapter 記述子。 */
  get selectedGenerator(): GeneratorDescriptor | undefined {
    return this.generators.find((g) => g.id === this.generatorId);
  }

  /** 現在の Adapter が対応する生成ターゲット一覧。 */
  get targets(): GeneratorTargetDescriptor[] {
    return this.selectedGenerator?.targets ?? [];
  }

  /** Generator / Profile を取得して選択肢を構成する。 */
  async load(): Promise<void> {
    const generators = await this.sdkGenerationService.listGenerators();
    if (generators.success) {
      this.generators = generators.data;
      // 選択中 Adapter が未取得なら先頭へ、target も範囲外なら先頭ターゲットへ寄せる。
      if (!this.selectedGenerator && generators.data.length > 0) {
        this.generatorId = generators.data[0].id;
      }
      if (this.targets.length > 0 && !this.targets.some((t) => t.name === this.generatorName)) {
        this.generatorName = this.targets[0].name;
      }
    }
    const profiles = await this.sdkGenerationService.listProfiles();
    if (profiles.success) this.profiles = profiles.data;
  }

  /** Profile を現在のフォームへ適用する。 */
  applyProfile(name: string): void {
    this.selectedProfileName = name;
    const profile = this.profiles.find((p) => p.name === name);
    if (!profile) return;
    this.generatorId = profile.generatorId;
    this.generatorName = profile.generatorName;
    this.packageName = profile.packageName;
    this.packageVersion = profile.packageVersion ?? '';
    this.outputDirectory = profile.outputDirectory;
    saveOutputDirectory(this.outputDirectory);
  }

  /** 現在のフォームを名前付き Profile として保存する。 */
  async saveProfile(name: string, schema: string): Promise<void> {
    this.profileError = null;
    const trimmed = name.trim();
    if (trimmed === '') {
      this.profileError = 'profile name is required';
      return;
    }
    const profile: SdkGenerationProfile = {
      name: trimmed,
      schemaName: schema.trim() === '' ? null : schema,
      generatorId: this.generatorId,
      generatorName: this.generatorName,
      packageName: this.packageName,
      packageVersion: this.packageVersion.trim() === '' ? null : this.packageVersion.trim(),
      outputDirectory: this.outputDirectory
    };
    const result = await this.sdkGenerationService.saveProfile(profile);
    if (result.success) {
      this.profiles = result.data;
      this.selectedProfileName = trimmed;
    } else {
      this.profileError = `${result.error.code}: ${result.error.message}`;
    }
  }

  /** 選択中 Profile を削除する。 */
  async deleteProfile(name: string): Promise<void> {
    this.profileError = null;
    if (name.trim() === '') return;
    const result = await this.sdkGenerationService.deleteProfile(name);
    if (result.success) {
      this.profiles = result.data;
      if (this.selectedProfileName === name) this.selectedProfileName = '';
    } else {
      this.profileError = `${result.error.code}: ${result.error.message}`;
    }
  }

  /** OS のフォルダー選択ダイアログを開き、選択されたら出力先へ反映・記憶する。 */
  async pickOutputDirectory(): Promise<void> {
    this.pickError = null;
    const result = await this.sdkGenerationService.pickOutputDirectory(this.outputDirectory);
    if (result.success) {
      if (result.data) {
        this.outputDirectory = result.data;
        saveOutputDirectory(this.outputDirectory);
      }
    } else {
      this.pickError = `${result.error.code}: ${result.error.message}`;
    }
  }

  get isRunning(): boolean {
    return this.phase === 'running';
  }

  get canRun(): boolean {
    return (
      this.packageName.trim() !== '' &&
      this.outputDirectory.trim() !== '' &&
      this.generatorName.trim() !== ''
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
      generatorName: this.generatorName,
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
    this.pickError = null;
  }
}
