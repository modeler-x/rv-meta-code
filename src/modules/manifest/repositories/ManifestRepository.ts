import { ok, fail, type Result } from '@/shared/result/Result';
import { invokeTauri } from '@/shared/ipc/invokeTauri';
import type { ManifestField } from '@/modules/manifest/types/ManifestField';
import type {
  CatalogCrud,
  ManifestOperation,
  ManifestCoverage,
  ManifestDiagnostic,
  ManifestDocument,
  ManifestFunction,
  StoredManifest
} from '@/modules/manifest/types/Manifest';

export interface IManifestRepository {
  /** 宣言できる項目の定義。スキーマに依存しないので引数を取らない。 */
  fields(): Promise<Result<ManifestField[]>>;
  /** 一覧の集約。スキーマごとに問い合わせない（19 スキーマで 95 回になり接続が尽きる）。 */
  overview(): Promise<Result<ManifestOverviewRow[]>>;
  /** スキーマを跨いだオペレーション一覧の材料。 */
  allFunctions(): Promise<Result<CatalogFunctionRow[]>>;
  crud(): Promise<Result<CatalogCrud[]>>;
  coverage(schemaName: string): Promise<Result<ManifestCoverage[]>>;
  functions(schemaName: string): Promise<Result<ManifestFunction[]>>;
  diagnose(schemaName: string): Promise<Result<ManifestDiagnostic[]>>;
  get(schemaName: string): Promise<Result<StoredManifest>>;
  draft(schemaName: string): Promise<Result<ManifestDocument>>;
  load(schemaName: string, manifest: ManifestDocument): Promise<Result<unknown>>;
}

/** DB が返す一覧の集約。ViewModel が ManifestOverview へ組み替える。 */
export type ManifestOverviewRow = {
  schemaName: string;
  hasManifest: boolean;
  generationMode: string | null;
  profiles: string[];
  operations: number;
  publicRoutes: number;
  declared: number;
  undeclared: number;
  orphaned: number;
  updatedAt: string | null;
};

export type CatalogFunctionRow = {
  schemaName: string;
  functionKey: string;
  state: string;
  comment: string | null;
  arguments: { name: string; type: string; required: boolean }[];
  operation: ManifestOperation | null;
};

export class ManifestRepository implements IManifestRepository {
  async fields(): Promise<Result<ManifestField[]>> {
    return call<ManifestField[]>('manifest_fields', {});
  }

  async overview(): Promise<Result<ManifestOverviewRow[]>> {
    return call<ManifestOverviewRow[]>('manifest_overview', {});
  }

  async allFunctions(): Promise<Result<CatalogFunctionRow[]>> {
    return call<CatalogFunctionRow[]>('all_manifest_functions', {});
  }

  async crud(): Promise<Result<CatalogCrud[]>> {
    return call<CatalogCrud[]>('catalog_crud', {});
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
