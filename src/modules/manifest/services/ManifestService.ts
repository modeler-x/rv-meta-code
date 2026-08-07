import type { IManifestRepository } from '@/modules/manifest/repositories/ManifestRepository';
import type {
  ManifestCoverage,
  ManifestDiagnostic,
  StoredManifest,
  SyncState
} from '@/modules/manifest/types/Manifest';
import type { Result } from '@/shared/result/Result';

export class ManifestService {
  constructor(private readonly manifestRepository: IManifestRepository) {}

  async loadCoverage(schemaName: string): Promise<Result<ManifestCoverage[]>> {
    return this.manifestRepository.coverage(schemaName);
  }

  async loadDiagnostics(schemaName: string): Promise<Result<ManifestDiagnostic[]>> {
    return this.manifestRepository.diagnose(schemaName);
  }

  async loadManifest(schemaName: string): Promise<Result<StoredManifest>> {
    return this.manifestRepository.get(schemaName);
  }

  /**
   * カタログから骨子を起こす。初版かどうかは区別しない。
   * 既存の宣言はサーバー側でマージされるので、人の編集は消えない。
   */
  async draftManifest(schemaName: string): Promise<Result<unknown>> {
    return this.manifestRepository.draft(schemaName);
  }

  /** 検証を通ったときだけ保存される。 */
  async saveManifest(schemaName: string, manifest: unknown): Promise<Result<unknown>> {
    return this.manifestRepository.load(schemaName, manifest);
  }
}

/**
 * 原本（リポジトリの manifest.sql）と下書き（DB）の一致状態。
 *
 * 下書きが消えるのは事故ではなく仕様で、リポジトリの適用パスに無いものは
 * mox init のたびに失われる。書き出す前に気づけるようにここで状態を出す。
 */
export function syncState(fileDigest: string | null, dbDigest: string | null): SyncState {
  if (!fileDigest && !dbDigest) return 'none';
  if (!fileDigest) return 'draft-only';
  if (!dbDigest) return 'file-ahead';
  return fileDigest === dbDigest ? 'synced' : 'draft-only';
}

/** error が 1 件でもあれば compile が止まる。 */
export function blocking(diagnostics: ManifestDiagnostic[]): ManifestDiagnostic[] {
  return diagnostics.filter((d) => d.severity === 'error');
}
