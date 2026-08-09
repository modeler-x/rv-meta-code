import { describe, expect, it } from 'vitest';
import { ManifestViewModel } from '@/modules/manifest/viewmodels/ManifestViewModel.svelte';
import { ManifestService } from '@/modules/manifest/services/ManifestService';
import { FakeManifestRepository } from './ManifestRepositoryFake';
import {
  diagnosticCount,
  fixture,
  functionOf,
  operationWithMostRoutes,
  routeCount,
  schemaNames,
  schemaWithDiagnostics,
  schemaWithMostRoutes,
  schemaWithUndeclared,
  undeclaredFunction
} from '../fixtures';

/**
 * 宣言をどう変えるかの判断はすべてここで確かめる。DOM は要らない。
 * 画面側のテストは「何を並べるか」だけを見て、同じ事実を二度確かめない。
 */
const SCHEMA = schemaWithMostRoutes();
const TARGET = operationWithMostRoutes(SCHEMA);
const MANIFEST = fixture.manifests[SCHEMA];

function schemaList(): { name: string; comment: string | null }[] {
  return fixture.list_schemas.map((s) => ({ name: s.schemaName, comment: s.comment }));
}

async function loaded(schema = SCHEMA, options: ConstructorParameters<typeof FakeManifestRepository>[0] = {}) {
  const repository = new FakeManifestRepository(options);
  const viewModel = new ManifestViewModel(new ManifestService(repository));
  await viewModel.load(schema);
  return { viewModel, repository };
}

describe('一覧の行', () => {
  it('スキーマごとに、宣言と診断の状態をまとめる', async () => {
    const { viewModel } = await loaded();
    await viewModel.loadOverviews(schemaList());

    // 一覧は DB 側の集約 1 回で取る。スキーマごとに問い合わせない。
    expect(viewModel.state.overviews.map((o) => o.schemaName)).toEqual(
      fixture.overview.map((o) => o.schemaName)
    );
    for (const overview of viewModel.state.overviews) {
      const source = fixture.overview.find((o) => o.schemaName === overview.schemaName)!;
      expect(overview.hasManifest).toBe(source.hasManifest);
      expect(overview.operationCount).toBe(source.operations);
      // 生成モードは出力される内容を変えるので一覧が持つ。
      expect(overview.generationMode).toBe(source.generationMode);
      // 診断は一覧では取らない（大きなスキーマで 25 秒かかる）。見たいときに実行する。
      expect(overview.errorCount).toBe(0);
    }
  });

  it('公開ルート数はスキーマ全体で数える', async () => {
    const { viewModel } = await loaded();
    await viewModel.loadOverviews(schemaList());
    const row = viewModel.state.overviews.find((o) => o.schemaName === SCHEMA)!;
    expect(row.publicRouteCount).toBe(
      Object.keys(MANIFEST.operations).reduce((n, k) => n + routeCount(MANIFEST, k), 0)
    );
  });

  it('診断は一覧では取らず、選んだスキーマにだけ実行する', async () => {
    // diagnose_manifest は 1198 operation のスキーマで 25 秒かかる。
    // 一覧を出すだけで全スキーマ分を走らせると待たされる。
    const { viewModel } = await loaded();
    const schema = schemaWithDiagnostics();
    if (!schema) return;
    const rows = await viewModel.loadDiagnosticsFor([schema]);
    expect(rows).toHaveLength(fixture.diagnostics[schema].length);
    expect(rows.every((row) => row.schemaName === schema)).toBe(true);
  });
});

describe('編集の開始と破棄', () => {
  it('読み込み時点では未編集', async () => {
    const { viewModel } = await loaded();
    expect(viewModel.isDirty).toBe(false);
  });

  it('編集すると未保存になり、破棄で戻る', async () => {
    const { viewModel } = await loaded();
    const before = JSON.stringify(viewModel.state.draft);

    viewModel.setOperationField(TARGET.key, 'operationId', 'changed');
    expect(viewModel.isDirty).toBe(true);

    viewModel.revert();
    expect(viewModel.isDirty).toBe(false);
    expect(JSON.stringify(viewModel.state.draft)).toBe(before);
  });

  it('保存済みを直接触らない（破棄で戻せる形で編集する）', async () => {
    const { viewModel } = await loaded();
    viewModel.setOperationField(TARGET.key, 'operationId', 'changed');
    const stored = viewModel.state.stored?.manifest as { operations: Record<string, { operationId?: string }> };
    expect(stored.operations[TARGET.key].operationId).not.toBe('changed');
  });
});

describe('宣言の増減', () => {
  it('宣言の無い関数に、要認証で宣言を足す', async () => {
    // 書き忘れが公開に化けないよう fail-closed にする。
    const schema = schemaWithUndeclared();
    if (!schema) return;
    const fn = undeclaredFunction(schema)!;
    const { viewModel } = await loaded(schema);

    viewModel.declareOperation(fn.functionKey);
    const operation = viewModel.operationOf(fn.functionKey)!;
    expect(operation.security).toEqual([{ bearerAuth: [] }]);
    expect(operation.operationId).toBeTruthy();
  });

  it('説明の既定は関数の COMMENT', async () => {
    const schema = schemaWithUndeclared();
    const fn = schema ? undeclaredFunction(schema) : null;
    if (!schema || !fn?.comment) return;
    const { viewModel } = await loaded(schema);

    viewModel.declareOperation(fn.functionKey);
    expect(viewModel.operationOf(fn.functionKey)?.description).toBe(fn.comment.trim());
  });

  it('既に宣言があるものは書き換えない', async () => {
    const { viewModel } = await loaded();
    const before = JSON.stringify(viewModel.operationOf(TARGET.key));
    viewModel.declareOperation(TARGET.key);
    expect(JSON.stringify(viewModel.operationOf(TARGET.key))).toBe(before);
  });

  it('宣言を外すと、その関数はどのドキュメントにも出なくなる', async () => {
    const { viewModel } = await loaded();
    viewModel.undeclareOperation(TARGET.key);
    expect(viewModel.operationOf(TARGET.key)).toBeUndefined();
  });
});

describe('公開ルート', () => {
  it('公開すると DEFAULT の無い引数が body に置かれる', async () => {
    // bind_missing_argument は必ず起きる指摘なので、空で作らせない。
    const { viewModel } = await loaded();
    const key = Object.keys(MANIFEST.operations)[0];
    viewModel.unpublish(key);
    viewModel.publish(key);

    const route = viewModel.routesOf(key)[0];
    for (const argument of functionOf(SCHEMA, key)!.arguments) {
      if (argument.required) expect(route.bind?.[argument.name]).toEqual({ from: 'body' });
    }
  });

  it('公開をやめると publicRoutes ごと落ちる', async () => {
    // 空配列を残すと「公開しているが 0 ルート」になり、既定拒否へ戻らない。
    const { viewModel } = await loaded();
    if (TARGET.routes === 0) return;
    viewModel.unpublish(TARGET.key);
    expect(viewModel.operationOf(TARGET.key)?.publicRoutes).toBeUndefined();
  });

  it('最後のルートを消すと publicRoutes ごと落ちる', async () => {
    const { viewModel } = await loaded();
    const key = Object.keys(MANIFEST.operations)[0];
    viewModel.unpublish(key);
    viewModel.publish(key);
    viewModel.removeRoute(key, 0);
    expect(viewModel.operationOf(key)?.publicRoutes).toBeUndefined();
  });

  it('path を書き換えると parameters が作り直される', async () => {
    // path_parameters_mismatch は path を見れば決まる。人に二度書かせない。
    const { viewModel } = await loaded();
    if (TARGET.routes === 0) return;
    viewModel.setRouteField(TARGET.key, 0, 'path', '/{alpha}/{beta}');
    expect(viewModel.routesOf(TARGET.key)[0].parameters?.map((p) => p.name)).toEqual(['alpha', 'beta']);
  });

  it('複製したルートは operationId を変える（重複で compile が落ちるため）', async () => {
    const { viewModel } = await loaded();
    if (TARGET.routes === 0) return;
    const original = viewModel.routesOf(TARGET.key)[0].operationId;
    viewModel.duplicateRoute(TARGET.key, 0);
    expect(viewModel.routesOf(TARGET.key)[1].operationId).not.toBe(original);
  });

  it('bind は宣言どおりの種別で読める', async () => {
    const { viewModel } = await loaded();
    if (TARGET.routes === 0) return;
    const route = (MANIFEST.operations[TARGET.key].publicRoutes ?? [])[0];
    for (const [argument, rule] of Object.entries(route.bind ?? {})) {
      const expected = rule.const !== undefined ? 'const' : (rule.from ?? 'unbound');
      expect(viewModel.bindKind(TARGET.key, 0, argument)).toBe(expected);
    }
  });

  it('未 bind へ変えるとキーごと消える', async () => {
    const { viewModel } = await loaded();
    if (TARGET.routes === 0) return;
    const argument = functionOf(SCHEMA, TARGET.key)!.arguments[0].name;
    viewModel.setBind(TARGET.key, 0, argument, 'unbound', '');
    expect(viewModel.bindRule(TARGET.key, 0, argument)).toBeUndefined();
  });
});

describe('profiles', () => {
  it('bff は既定を入れて足す（毎回同じ 2 項目を書かせない）', async () => {
    const { viewModel } = await loaded();
    viewModel.removeProfile('bff');
    viewModel.addProfile('bff');

    const profile = viewModel.profileOf('bff')!;
    expect(profile.generationMode).toBe('function_only');
    expect(profile.naming?.stripPrefix?.arg).toBe('p_');
  });

  it('postgrest は空で足す（未宣言は DB が推論する）', async () => {
    const { viewModel } = await loaded();
    viewModel.removeProfile('postgrest');
    viewModel.addProfile('postgrest');
    expect(viewModel.profileOf('postgrest')).toEqual({});
  });

  it('空文字はキーごと消す（既定の推論へ戻せる）', async () => {
    const { viewModel } = await loaded();
    viewModel.setProfileField('postgrest', 'basePath', 'x');
    expect(viewModel.profileOf('postgrest')?.basePath).toBe('x');

    viewModel.setProfileField('postgrest', 'basePath', '');
    expect(viewModel.profileOf('postgrest')).not.toHaveProperty('basePath');
  });
});

describe('保存', () => {
  it('検証に落ちたら保存されず、編集は残る', async () => {
    // 成功として扱うと、書き出していない下書きを保存済みと誤表示する。
    const { viewModel } = await loaded(SCHEMA, { rejectLoad: true });
    viewModel.setOperationField(TARGET.key, 'operationId', 'changed');

    expect(await viewModel.save()).toBe(false);
    expect(viewModel.isDirty).toBe(true);
    expect(viewModel.state.errorMessage).toBeTruthy();
  });

  it('成功したら未編集へ戻る', async () => {
    const { viewModel, repository } = await loaded();
    viewModel.setOperationField(TARGET.key, 'operationId', 'changed');

    expect(await viewModel.save()).toBe(true);
    expect(repository.saved).toHaveLength(1);
    expect(viewModel.isDirty).toBe(false);
  });

  it('骨子はまとめて起こして保存する', async () => {
    // 起こしただけでは DB に入らず、一覧の状態が変わらない。
    const { viewModel, repository } = await loaded();
    await viewModel.draftMany([SCHEMA]);
    expect(repository.drafted).toEqual([SCHEMA]);
    expect(repository.saved.map((s) => s.schemaName)).toEqual([SCHEMA]);
  });
});
