import { ok, fail, type Result } from '@/shared/result/Result';
import type { ISdkGenerationRepository } from '@/modules/sdk/repositories/SdkGenerationRepository';
import type {
  SdkGenerationForm,
  SdkGenerationOutcome
} from '@/modules/sdk/types/SdkGeneration';

export class SdkGenerationService {
  constructor(private readonly repository: ISdkGenerationRepository) {}

  /** OS フォルダー選択ダイアログを開く。選択パス（キャンセル時 null）を返す。 */
  async pickOutputDirectory(current: string): Promise<Result<string | null>> {
    return this.repository.pickOutputDirectory(current);
  }

  /**
   * 処理順を固定する: OpenAPI取得 → Validation → Validation成功時だけ生成 → 結果。
   * 検証不合格なら生成を開始しない。
   */
  async runGeneration(
    schema: string,
    form: SdkGenerationForm
  ): Promise<Result<SdkGenerationOutcome>> {
    const documentResult = await this.repository.getOpenApiDocument(schema);
    if (!documentResult.success) {
      return fail<SdkGenerationOutcome>(documentResult.error.code, documentResult.error.message);
    }

    const validationResult = await this.repository.validateOpenApi(schema);
    if (!validationResult.success) {
      return fail<SdkGenerationOutcome>(validationResult.error.code, validationResult.error.message);
    }

    const report = validationResult.data;
    if (!report.isValid) {
      // Validation Error があれば生成を開始しない。
      return ok<SdkGenerationOutcome>({ kind: 'invalid', report });
    }

    const generateResult = await this.repository.generateSdk({
      generatorId: form.generatorId,
      schemaName: schema,
      openapiDocument: documentResult.data,
      language: form.language,
      packageName: form.packageName,
      packageVersion: form.packageVersion.trim() === '' ? null : form.packageVersion.trim(),
      outputDirectory: form.outputDirectory,
      additionalProperties: {}
    });
    if (!generateResult.success) {
      return fail<SdkGenerationOutcome>(generateResult.error.code, generateResult.error.message);
    }

    return ok<SdkGenerationOutcome>({ kind: 'generated', report, result: generateResult.data });
  }
}
