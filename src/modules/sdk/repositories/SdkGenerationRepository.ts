import { ok, fail, type Result } from '@/shared/result/Result';
import { invokeTauri } from '@/shared/ipc/invokeTauri';
import { toIpcErrorMessage } from '@/shared/ipc/toIpcErrorMessage';
import type {
  GenerateSdkRequest,
  GenerateSdkResult,
  GeneratorDescriptor,
  OpenApiDocument,
  SdkGenerationProfile,
  ValidationReport
} from '@/modules/sdk/types/SdkGeneration';

type OpenApiSpecRow = { schemaName: string; spec: OpenApiDocument };

export interface ISdkGenerationRepository {
  getOpenApiDocument(schema: string): Promise<Result<OpenApiDocument>>;
  validateOpenApi(schema: string): Promise<Result<ValidationReport>>;
  generateSdk(request: GenerateSdkRequest): Promise<Result<GenerateSdkResult>>;
  /** 利用可能な Generator（Adapter）と対応ターゲットを取得する。 */
  listGenerators(): Promise<Result<GeneratorDescriptor[]>>;
  /** 保存済み Profile を取得する。 */
  listProfiles(): Promise<Result<SdkGenerationProfile[]>>;
  /** Profile を upsert し、保存後の一覧を返す。 */
  saveProfile(profile: SdkGenerationProfile): Promise<Result<SdkGenerationProfile[]>>;
  /** Profile を削除し、削除後の一覧を返す。 */
  deleteProfile(name: string): Promise<Result<SdkGenerationProfile[]>>;
  /** OS のフォルダー選択ダイアログを開く。キャンセル時は null。 */
  pickOutputDirectory(current: string): Promise<Result<string | null>>;
}

export class SdkGenerationRepository implements ISdkGenerationRepository {
  async getOpenApiDocument(schema: string): Promise<Result<OpenApiDocument>> {
    try {
      const specs = await invokeTauri<OpenApiSpecRow[]>('get_openapi_specs', { schemas: [schema] });
      const doc = specs[0]?.spec;
      if (!doc) return fail<OpenApiDocument>('NOT_FOUND', `openapi document not found for "${schema}"`);
      return ok(doc);
    } catch (error) {
      return fail<OpenApiDocument>('IPC_ERROR', toIpcErrorMessage(error));
    }
  }

  async validateOpenApi(schema: string): Promise<Result<ValidationReport>> {
    try {
      return ok(await invokeTauri<ValidationReport>('validate_openapi', { schema }));
    } catch (error) {
      return fail<ValidationReport>('IPC_ERROR', toIpcErrorMessage(error));
    }
  }

  async generateSdk(request: GenerateSdkRequest): Promise<Result<GenerateSdkResult>> {
    try {
      return ok(await invokeTauri<GenerateSdkResult>('generate_sdk', { request }));
    } catch (error) {
      // backend の AppError.code（GENERATOR_NOT_AVAILABLE 等）を保持する。
      const shape = error as { code?: string; message?: string } | null;
      const code = shape && typeof shape.code === 'string' ? shape.code : 'IPC_ERROR';
      return fail<GenerateSdkResult>(code, toIpcErrorMessage(error));
    }
  }

  async listGenerators(): Promise<Result<GeneratorDescriptor[]>> {
    try {
      return ok(await invokeTauri<GeneratorDescriptor[]>('list_generators'));
    } catch (error) {
      return fail<GeneratorDescriptor[]>('IPC_ERROR', toIpcErrorMessage(error));
    }
  }

  async listProfiles(): Promise<Result<SdkGenerationProfile[]>> {
    try {
      return ok(await invokeTauri<SdkGenerationProfile[]>('list_sdk_profiles'));
    } catch (error) {
      return fail<SdkGenerationProfile[]>('IPC_ERROR', toIpcErrorMessage(error));
    }
  }

  async saveProfile(profile: SdkGenerationProfile): Promise<Result<SdkGenerationProfile[]>> {
    try {
      return ok(await invokeTauri<SdkGenerationProfile[]>('save_sdk_profile', { profile }));
    } catch (error) {
      return fail<SdkGenerationProfile[]>('IPC_ERROR', toIpcErrorMessage(error));
    }
  }

  async deleteProfile(name: string): Promise<Result<SdkGenerationProfile[]>> {
    try {
      return ok(await invokeTauri<SdkGenerationProfile[]>('delete_sdk_profile', { name }));
    } catch (error) {
      return fail<SdkGenerationProfile[]>('IPC_ERROR', toIpcErrorMessage(error));
    }
  }

  async pickOutputDirectory(current: string): Promise<Result<string | null>> {
    try {
      // 動的 import で vitest（非Tauri環境）でのロード失敗を避ける。
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: current.trim() === '' ? undefined : current
      });
      return ok(typeof selected === 'string' ? selected : null);
    } catch (error) {
      return fail<string | null>('IPC_ERROR', toIpcErrorMessage(error));
    }
  }
}
