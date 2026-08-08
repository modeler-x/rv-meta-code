import { ok, fail, type Result } from '@/shared/result/Result';
import type { IManifestRepository } from '@/modules/manifest/repositories/ManifestRepository';
import type {
  ManifestCoverage,
  ManifestDiagnostic,
  ManifestDocument,
  ManifestFunction,
  StoredManifest
} from '@/modules/manifest/types/Manifest';
import { fixture } from '../fixtures';

/**
 * dev DB から採った実データを返す Repository。
 *
 * 手書きの素材を使わないのは、実物と食い違ったテストが通ってしまうと
 * 画面を確かめる意味が無くなるため。素材の更新は tests/fixtures/capture.sh。
 */
export class FakeManifestRepository implements IManifestRepository {
  saved: { schemaName: string; manifest: ManifestDocument }[] = [];
  drafted: string[] = [];

  constructor(
    private readonly options: {
      rejectLoad?: boolean;
      /** 差し替える manifest。壊した宣言を渡して表示を確かめるのに使う。 */
      manifests?: Record<string, ManifestDocument>;
      diagnostics?: Record<string, ManifestDiagnostic[]>;
    } = {}
  ) {}

  private manifestOf(schemaName: string): ManifestDocument | null {
    const override = this.options.manifests?.[schemaName];
    if (override) return override;
    return (fixture.manifests[schemaName] as ManifestDocument | undefined) ?? null;
  }

  async coverage(schemaName: string): Promise<Result<ManifestCoverage[]>> {
    return ok((fixture.coverage[schemaName] ?? []) as ManifestCoverage[]);
  }

  async functions(schemaName: string): Promise<Result<ManifestFunction[]>> {
    return ok((fixture.functions[schemaName] ?? []) as ManifestFunction[]);
  }

  async diagnose(schemaName: string): Promise<Result<ManifestDiagnostic[]>> {
    const override = this.options.diagnostics?.[schemaName];
    return ok(override ?? ((fixture.diagnostics[schemaName] ?? []) as ManifestDiagnostic[]));
  }

  async get(schemaName: string): Promise<Result<StoredManifest>> {
    return ok({
      schemaName,
      manifest: this.manifestOf(schemaName),
      updatedAt: '2026-08-08T00:00:00Z'
    });
  }

  async draft(schemaName: string): Promise<Result<ManifestDocument>> {
    this.drafted.push(schemaName);
    const current = this.manifestOf(schemaName) ?? { schema: schemaName, operations: {} };
    const operations = { ...(current.operations ?? {}) };
    // draft は「カタログにあって宣言に無いものを足す」。既存は書き換えない。
    for (const fn of fixture.functions[schemaName] ?? []) {
      if (!operations[fn.functionKey]) {
        operations[fn.functionKey] = { operationId: fn.functionKey.split('(')[0] };
      }
    }
    return ok({ ...current, operations });
  }

  async load(schemaName: string, manifest: ManifestDocument): Promise<Result<unknown>> {
    if (this.options.rejectLoad) {
      return fail<unknown>('IPC_ERROR', `manifest of schema "${schemaName}" has 1 error(s)`);
    }
    this.saved.push({ schemaName, manifest });
    return ok({ operations: Object.keys(manifest.operations ?? {}).length });
  }
}
