import { ok, fail, type Result } from '@/shared/result/Result';
import { invokeTauri } from '@/shared/ipc/invokeTauri';
import type { ManifestField } from '@/modules/manifest/types/ManifestField';
import type {
  ManifestCoverage,
  ManifestDiagnostic,
  ManifestDocument,
  ManifestFunction,
  StoredManifest
} from '@/modules/manifest/types/Manifest';

export interface IManifestRepository {
  /** 宣言できる項目の定義。スキーマに依存しないので引数を取らない。 */
  fields(): Promise<Result<ManifestField[]>>;
  coverage(schemaName: string): Promise<Result<ManifestCoverage[]>>;
  functions(schemaName: string): Promise<Result<ManifestFunction[]>>;
  diagnose(schemaName: string): Promise<Result<ManifestDiagnostic[]>>;
  get(schemaName: string): Promise<Result<StoredManifest>>;
  draft(schemaName: string): Promise<Result<ManifestDocument>>;
  load(schemaName: string, manifest: ManifestDocument): Promise<Result<unknown>>;
}

export class ManifestRepository implements IManifestRepository {
  async fields(): Promise<Result<ManifestField[]>> {
    return call<ManifestField[]>('manifest_fields', {});
  }

  async coverage(schemaName: string): Promise<Result<ManifestCoverage[]>> {
    return call<ManifestCoverage[]>('manifest_coverage', { schemaName });
  }

  /** 引数と関数 COMMENT。bind の行を人に書かせないための入力元。 */
  async functions(schemaName: string): Promise<Result<ManifestFunction[]>> {
    return call<ManifestFunction[]>('manifest_functions', { schemaName });
  }

  async diagnose(schemaName: string): Promise<Result<ManifestDiagnostic[]>> {
    return call<ManifestDiagnostic[]>('diagnose_manifest', { schemaName });
  }

  async get(schemaName: string): Promise<Result<StoredManifest>> {
    return call<StoredManifest>('get_manifest', { schemaName });
  }

  /** カタログから骨子を起こしてマージした結果を返す。保存はしない。 */
  async draft(schemaName: string): Promise<Result<ManifestDocument>> {
    return call<ManifestDocument>('draft_manifest', { schemaName });
  }

  /** 検証を通ったときだけ保存される。error があれば書かずに失敗する。 */
  async load(schemaName: string, manifest: ManifestDocument): Promise<Result<unknown>> {
    return call<unknown>('load_manifest', { schemaName, manifest });
  }
}

async function call<T>(command: string, args: Record<string, unknown>): Promise<Result<T>> {
  try {
    return ok(await invokeTauri<T>(command, args));
  } catch (error) {
    return fail<T>('IPC_ERROR', errorMessage(error));
  }
}

function errorMessage(error: unknown): string {
  const shape = error as { message?: string } | null;
  return shape && typeof shape.message === 'string' ? shape.message : String(error);
}
