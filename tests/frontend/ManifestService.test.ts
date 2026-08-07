import { describe, expect, it } from 'vitest';
import { ok, fail, type Result } from '@/shared/result/Result';
import { ManifestService, blocking, syncState } from '@/modules/manifest/services/ManifestService';
import type { IManifestRepository } from '@/modules/manifest/repositories/ManifestRepository';
import type {
  ManifestCoverage,
  ManifestDiagnostic,
  StoredManifest
} from '@/modules/manifest/types/Manifest';

const DIAGNOSTICS: ManifestDiagnostic[] = [
  {
    severity: 'error',
    location: 'operations."receive(p_payload jsonb, p_operation text)".publicRoutes[1].bind.p_payload',
    code: 'bind_missing_argument',
    message: 'DEFAULT を持たない引数 p_payload が bind されていない',
    hint: '{"from":"body"} を足す'
  },
  {
    severity: 'info',
    location: 'operations."compile(p_document_type text)"',
    code: 'function_not_declared',
    message: '公開関数だが manifest に宣言が無い',
    hint: null
  }
];

class FakeManifestRepository implements IManifestRepository {
  loaded: unknown = null;
  constructor(private readonly rejectLoad = false) {}

  async coverage(): Promise<Result<ManifestCoverage[]>> {
    return ok([
      { functionKey: 'receive(p_payload jsonb, p_operation text)', state: 'declared' },
      { functionKey: 'compile(p_document_type text)', state: 'undeclared' }
    ]);
  }
  async diagnose(): Promise<Result<ManifestDiagnostic[]>> {
    return ok(DIAGNOSTICS);
  }
  async get(schemaName: string): Promise<Result<StoredManifest>> {
    return ok({ schemaName, manifest: { schema: schemaName }, updatedAt: '2026-08-06T00:00:00Z' });
  }
  async draft(schemaName: string): Promise<Result<unknown>> {
    return ok({ schema: schemaName, operations: { 'compile(p_document_type text)': {} } });
  }
  async load(_schemaName: string, manifest: unknown): Promise<Result<unknown>> {
    if (this.rejectLoad) return fail<unknown>('IPC_ERROR', 'manifest has 1 error(s)');
    this.loaded = manifest;
    return ok({ operations: 1 });
  }
}

describe('ManifestService', () => {
  it('passes the schema through to each repository call', async () => {
    const service = new ManifestService(new FakeManifestRepository());
    const coverage = await service.loadCoverage('rv_intake');
    expect(coverage.success && coverage.data.length).toBe(2);

    const stored = await service.loadManifest('rv_intake');
    expect(stored.success && stored.data.schemaName).toBe('rv_intake');
  });

  it('reports a failed save instead of pretending it was stored', async () => {
    // 検証に落ちた manifest は保存されない。成功として扱うと、
    // 書き出していない下書きを「保存済み」と誤表示する。
    const service = new ManifestService(new FakeManifestRepository(true));
    const result = await service.saveManifest('rv_intake', { schema: 'rv_intake' });
    expect(result.success).toBe(false);
  });
});

describe('blocking', () => {
  it('counts only error as blocking', () => {
    // info は生成できる。compile を止めるのは error だけ。
    expect(blocking(DIAGNOSTICS)).toHaveLength(1);
    expect(blocking(DIAGNOSTICS)[0].code).toBe('bind_missing_argument');
  });
});

describe('syncState', () => {
  it('marks a draft that was never written to the repository', () => {
    // リポジトリの適用パスに無いものは mox init のたびに消える。
    expect(syncState(null, 'sha256:aaa')).toBe('draft-only');
  });

  it('marks differing content as an unwritten draft', () => {
    expect(syncState('sha256:aaa', 'sha256:bbb')).toBe('draft-only');
  });

  it('marks matching digests as synced', () => {
    expect(syncState('sha256:aaa', 'sha256:aaa')).toBe('synced');
  });

  it('marks a file with no draft loaded yet', () => {
    expect(syncState('sha256:aaa', null)).toBe('file-ahead');
  });

  it('marks the absence of both', () => {
    expect(syncState(null, null)).toBe('none');
  });
});
