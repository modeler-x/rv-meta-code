import { describe, expect, it } from 'vitest';
import {
  ManifestService,
  bindKindOf,
  blocking,
  buildBindRule,
  diagnosticsOf,
  functionKeyOf,
  newOperation,
  newRoute,
  parametersFromPath,
  syncState,
  toCamelCase
} from '@/modules/manifest/services/ManifestService';
import { FakeManifestRepository } from './ManifestRepositoryFake';
import {
  fixture,
  functionOf,
  operationWithMostRoutes,
  schemaWithDiagnostics,
  schemaWithMostRoutes,
  undeclaredFunction
} from '../fixtures';

const SCHEMA = schemaWithMostRoutes();
const TARGET = operationWithMostRoutes(SCHEMA);

describe('ManifestService', () => {
  it('スキーマをそのまま Repository へ渡す', async () => {
    const service = new ManifestService(new FakeManifestRepository());

    const coverage = await service.loadCoverage(SCHEMA);
    expect(coverage.success && coverage.data.length).toBe(fixture.coverage[SCHEMA].length);

    const stored = await service.loadManifest(SCHEMA);
    expect(stored.success && stored.data.schemaName).toBe(SCHEMA);

    const functions = await service.loadFunctions(SCHEMA);
    expect(functions.success && functions.data.length).toBe(fixture.functions[SCHEMA].length);
  });

  it('保存に失敗したら成功として扱わない', async () => {
    // 検証に落ちた manifest は保存されない。成功として扱うと、
    // 書き出していない下書きを「保存済み」と誤表示する。
    const service = new ManifestService(new FakeManifestRepository({ rejectLoad: true }));
    const result = await service.saveManifest(SCHEMA, fixture.manifests[SCHEMA]);
    expect(result.success).toBe(false);
  });
});

describe('診断の絞り込み', () => {
  it('compile を止めるのは error だけ', () => {
    const schema = schemaWithDiagnostics();
    const diagnostics = schema ? fixture.diagnostics[schema] : [];
    expect(blocking(diagnostics)).toHaveLength(diagnostics.filter((d) => d.severity === 'error').length);
  });

  it('location から関数キーを取り出す', () => {
    expect(functionKeyOf(`operations."${TARGET.key}".publicRoutes[0]`)).toBe(TARGET.key);
    // スキーマ全体の指摘は関数を指さない。
    expect(functionKeyOf('profiles.bff.basePath')).toBeNull();
  });

  it('その operation の指摘だけを拾う', () => {
    const diagnostics = [
      { severity: 'error' as const, location: `operations."${TARGET.key}".publicRoutes[0].path`, code: 'a', message: '', hint: null },
      { severity: 'error' as const, location: 'operations."other(x text)"', code: 'b', message: '', hint: null }
    ];
    expect(diagnosticsOf(diagnostics, TARGET.key).map((d) => d.code)).toEqual(['a']);
  });
});

describe('入力を減らすための導出', () => {
  it('path の {param} から parameters(in=path) を作る', () => {
    // path_parameters_mismatch は path を見れば決まる。人に二度書かせない。
    const parameters = parametersFromPath('/{documentType}/{documentNumber}/actions/cancel');
    expect(parameters.map((p) => p.name)).toEqual(['documentType', 'documentNumber']);
    expect(parameters.every((p) => p.in === 'path' && p.required)).toBe(true);
  });

  it('{param} が無ければ parameters は空になる', () => {
    expect(parametersFromPath('/schemas')).toEqual([]);
  });

  it('関数名から operationId を推測する', () => {
    expect(toCamelCase('get_current_user')).toBe('getCurrentUser');
    expect(toCamelCase('receive')).toBe('receive');
  });

  it('新しいルートは DEFAULT の無い引数を body に置く', () => {
    // bind_missing_argument は必ず起きる指摘なので、空で作らせない。
    const args = functionOf(SCHEMA, TARGET.key)!.arguments;
    const route = newRoute(TARGET.key, {}, args);
    for (const argument of args) {
      const rule = route.bind?.[argument.name];
      if (argument.required) expect(rule).toEqual({ from: 'body' });
      else expect(rule).toBeUndefined();
    }
  });

  it('新しい宣言は要認証で作る（fail-closed）', () => {
    // 書き忘れが公開に化けないようにする。
    const fn = functionOf(SCHEMA, TARGET.key);
    const operation = newOperation(TARGET.key, fn, 'Intake');
    expect(operation.security).toEqual([{ bearerAuth: [] }]);
    expect(operation.tags).toEqual(['Intake']);
  });

  it('新しい宣言の説明は関数の COMMENT から取る', () => {
    const withComment = fixture.functions[SCHEMA].find((f) => (f.comment ?? '').trim().length > 0);
    if (!withComment) return;
    const operation = newOperation(withComment.functionKey, withComment, 'Intake');
    expect(operation.description).toBe(withComment.comment?.trim());
  });
});

describe('bind の変換', () => {
  it('宣言から種別を読む', () => {
    expect(bindKindOf({ from: 'body' })).toBe('body');
    expect(bindKindOf({ from: 'path', name: 'documentType' })).toBe('path');
    expect(bindKindOf({ const: 'create' })).toBe('const');
    expect(bindKindOf(undefined)).toBe('unbound');
  });

  it('未 bind はキーごと消す（空 object を残さない）', () => {
    // {} を残すと bind されているように見えるが、実際には値が来ない。
    expect(buildBindRule('unbound', '')).toBeUndefined();
  });

  it('const は値をそのまま固定する', () => {
    expect(buildBindRule('const', 'create')).toEqual({ const: 'create' });
  });

  it('from は名前が空なら name を書かない', () => {
    expect(buildBindRule('body', '')).toEqual({ from: 'body' });
    expect(buildBindRule('path', 'documentType')).toEqual({ from: 'path', name: 'documentType' });
  });
});

describe('syncState', () => {
  it('リポジトリへ書き出していない下書きを見分ける', () => {
    // 適用パスに無いものは mox init のたびに消える。
    expect(syncState(null, 'sha256:aaa')).toBe('draft-only');
  });

  it('内容が違えば未書き出しとして扱う', () => {
    expect(syncState('sha256:aaa', 'sha256:bbb')).toBe('draft-only');
  });

  it('一致していれば synced', () => {
    expect(syncState('sha256:aaa', 'sha256:aaa')).toBe('synced');
  });

  it('ファイルだけにあれば file-ahead', () => {
    expect(syncState('sha256:aaa', null)).toBe('file-ahead');
  });

  it('どちらにも無ければ none', () => {
    expect(syncState(null, null)).toBe('none');
  });
});

describe('未宣言の関数', () => {
  it('フィクスチャの未宣言は coverage と一致する', () => {
    // undeclared は既定拒否で非公開になっているだけで、error ではない。
    for (const schema of Object.keys(fixture.functions)) {
      const fromFunctions = fixture.functions[schema].filter((f) => f.state === 'undeclared').length;
      const fromCoverage = fixture.coverage[schema].filter((c) => c.state === 'undeclared').length;
      expect(fromFunctions).toBe(fromCoverage);
    }
    // 少なくとも 1 件は未宣言があるはず（運用操作は宣言しない）。
    expect(Object.keys(fixture.functions).some((s) => undeclaredFunction(s) != null)).toBe(true);
  });
});
