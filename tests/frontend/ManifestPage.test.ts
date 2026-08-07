import { render, fireEvent, cleanup, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, it, expect, afterEach } from 'vitest';
import ManifestPage from '@/pages/ManifestPage.svelte';
import SchemaPage from '@/pages/SchemaPage.svelte';
import { ManifestViewModel } from '@/modules/manifest/viewmodels/ManifestViewModel.svelte';
import { ManifestService } from '@/modules/manifest/services/ManifestService';
import { SchemaViewModel } from '@/modules/schema/viewmodels/SchemaViewModel.svelte';
import { SchemaService } from '@/modules/schema/services/SchemaService';
import { GenerationViewModel } from '@/modules/generation/viewmodels/GenerationViewModel.svelte';
import { GenerationService } from '@/modules/generation/services/GenerationService';
import type { IManifestRepository } from '@/modules/manifest/repositories/ManifestRepository';
import type { ISchemaRepository } from '@/modules/schema/repositories/SchemaRepository';
import type { SchemaSummary } from '@/modules/schema/types/SchemaSummary';
import { ok, fail, type Result } from '@/shared/result/Result';
import type {
  ManifestCoverage,
  ManifestDiagnostic,
  StoredManifest
} from '@/modules/manifest/types/Manifest';

/**
 * 素材は dev の rv_intake の実データに合わせる。
 * receive() は 1 本で 3 ルート、compile() は運用操作なので宣言していない。
 * publicRoutes[1] にわざと未 bind を作り、診断からのジャンプを確かめる。
 */
const MANIFEST = {
  schema: 'rv_intake',
  profiles: {
    postgrest: { basePath: 'intake', generationMode: 'function_only', naming: { stripPrefix: { arg: '' } } },
    bff: { basePath: 'intake', generationMode: 'function_only', naming: { stripPrefix: { arg: 'p_' } } }
  },
  defaults: { operationGroup: 'Intake', tags: ['Intake'], security: [{ bearerAuth: [] }] },
  operations: {
    'receive(p_payload jsonb, p_operation text)': {
      operationId: 'receiveDocument',
      description: '文書を受信して検証結果を返す。',
      publicRoutes: [
        {
          operationId: 'createDocument',
          method: 'POST',
          path: '/{documentType}',
          summary: '文書を登録する',
          bind: { p_operation: { const: 'create' }, p_payload: { from: 'body' } }
        },
        {
          operationId: 'updateDocument',
          method: 'PUT',
          path: '/{documentType}/{documentNumber}',
          summary: '文書を置換する',
          bind: { p_operation: { const: 'update' }, p_payload: {} }
        },
        {
          operationId: 'cancelDocument',
          method: 'POST',
          path: '/{documentType}/{documentNumber}/actions/cancel',
          bind: { p_operation: { const: 'remove' }, p_payload: { from: 'body' } }
        }
      ]
    },
    'schema(p_document_type text, p_operation text)': { operationId: 'getDocumentSchema' }
  }
};

const RECEIVE_KEY = 'receive(p_payload jsonb, p_operation text)';

// vitest の globals を使っていないので自動 cleanup が働かない。落とさないと
// 前のテストの DOM が残る。加えて render が返すクエリは document.body 全体を
// 見るため、各テストは within(container) でスコープして数える。
afterEach(cleanup);

const DIAGNOSTICS: ManifestDiagnostic[] = [
  {
    severity: 'error',
    location: `operations."${RECEIVE_KEY}".publicRoutes[1].bind.p_payload`,
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

const COVERAGE: ManifestCoverage[] = [
  { functionKey: RECEIVE_KEY, state: 'declared' },
  { functionKey: 'schema(p_document_type text, p_operation text)', state: 'declared' },
  { functionKey: 'compile(p_document_type text)', state: 'undeclared' }
];

class FakeManifestRepository implements IManifestRepository {
  drafted: string[] = [];
  constructor(private readonly rejectLoad = false) {}
  async coverage(): Promise<Result<ManifestCoverage[]>> {
    return ok(COVERAGE);
  }
  async diagnose(): Promise<Result<ManifestDiagnostic[]>> {
    return ok(DIAGNOSTICS);
  }
  async get(schemaName: string): Promise<Result<StoredManifest>> {
    return ok({ schemaName, manifest: MANIFEST, updatedAt: '2026-08-06T00:00:00Z' });
  }
  async draft(schemaName: string): Promise<Result<unknown>> {
    this.drafted.push(schemaName);
    return ok(MANIFEST);
  }
  async load(): Promise<Result<unknown>> {
    if (this.rejectLoad) {
      return fail<unknown>('IPC_ERROR', 'manifest of schema "rv_intake" has 1 error(s)');
    }
    return ok({ operations: 2 });
  }
}

class FakeSchemaRepository implements ISchemaRepository {
  async listSchemas(): Promise<Result<SchemaSummary[]>> {
    return ok([
      { name: 'rv_intake', comment: '文書受信', tableCount: 10, viewCount: 0 },
      { name: 'rv_auth', comment: 'Auth', tableCount: 4, viewCount: 0 }
    ]);
  }
}

async function mountManifest(rejectLoad = false) {
  const repository = new FakeManifestRepository(rejectLoad);
  const viewModel = new ManifestViewModel(new ManifestService(repository));
  await viewModel.load('rv_intake');
  const rendered = render(ManifestPage, { props: { viewModel, schemaName: 'rv_intake' } });
  await tick();
  return { screen: within(rendered.container), viewModel, repository };
}

describe('シナリオ: カタログでスキーマの埋まり具合を見て、マニフェストへ入る', () => {
  it('宣言済みと未宣言の件数が行に出る', async () => {
    const manifestViewModel = new ManifestViewModel(new ManifestService(new FakeManifestRepository()));
    const schemaViewModel = new SchemaViewModel(new SchemaService(new FakeSchemaRepository()));
    await schemaViewModel.loadSchemas();
    await manifestViewModel.loadCoverageFor(['rv_intake', 'rv_auth']);

    const rendered = render(SchemaPage, {
      props: {
        viewModel: schemaViewModel,
        generationViewModel: new GenerationViewModel(new GenerationService()),
        manifestViewModel
      }
    });
    await tick();
    const screen = within(rendered.container);

    // 未宣言は既定拒否で非公開になっているだけでエラーではないが、件数は出す。
    expect(screen.getAllByText(/2 宣言済み/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 未宣言/).length).toBeGreaterThan(0);
  });

  it('行の「開く」でそのスキーマのマニフェストへ渡す', async () => {
    const manifestViewModel = new ManifestViewModel(new ManifestService(new FakeManifestRepository()));
    const schemaViewModel = new SchemaViewModel(new SchemaService(new FakeSchemaRepository()));
    await schemaViewModel.loadSchemas();
    const opened: string[] = [];

    const rendered = render(SchemaPage, {
      props: {
        viewModel: schemaViewModel,
        generationViewModel: new GenerationViewModel(new GenerationService()),
        manifestViewModel,
        onOpenManifest: (name: string) => opened.push(name)
      }
    });
    await tick();
    const screen = within(rendered.container);

    await fireEvent.click(screen.getAllByRole('button', { name: '開く' })[0]);
    expect(opened).toEqual(['rv_intake']);
  });

  it('選択したスキーマの骨子をまとめて起こす', async () => {
    const repository = new FakeManifestRepository();
    const manifestViewModel = new ManifestViewModel(new ManifestService(repository));
    const schemaViewModel = new SchemaViewModel(new SchemaService(new FakeSchemaRepository()));
    await schemaViewModel.loadSchemas();

    const rendered = render(SchemaPage, {
      props: {
        viewModel: schemaViewModel,
        generationViewModel: new GenerationViewModel(new GenerationService()),
        manifestViewModel
      }
    });
    await tick();
    const screen = within(rendered.container);

    const row = screen.getAllByRole('checkbox', { name: 'rv_intake' })[0];
    await fireEvent.change(row, { target: { checked: true } });
    await tick();
    await fireEvent.click(screen.getByRole('button', { name: 'カタログから起こす' }));
    await tick();

    expect(repository.drafted).toEqual(['rv_intake']);
  });
});

describe('シナリオ: マニフェストで宣言と診断を確認する', () => {
  it('スキーマ単位の宣言（profiles）はページ本体に出る', async () => {
    // operation ごとに変わらないので Drawer ではなくページに置く。
    const { screen } = await mountManifest();
    expect(screen.getByText('postgrest')).toBeTruthy();
    expect(screen.getByText('bff')).toBeTruthy();
  });

  it('operation ごとに公開ルート数と error 件数が出る', async () => {
    const { screen } = await mountManifest();
    expect(screen.getAllByText(RECEIVE_KEY).length).toBeGreaterThan(0);
    expect(screen.getAllByText('bff 3').length).toBe(1);
    // publicRoutes を持たない operation は非公開として出す。
    expect(screen.getAllByText('非公開').length).toBeGreaterThan(0);
  });

  it('診断は error も info も全件出る', async () => {
    // 最初の 1 件で止めないのが manifest 方式の利点なので、件数を固定する。
    const { screen } = await mountManifest();
    expect(screen.getAllByText('bind_missing_argument').length).toBeGreaterThan(0);
    expect(screen.getAllByText('function_not_declared').length).toBeGreaterThan(0);
  });
});

describe('シナリオ: 診断から編集箇所へ飛び、Drawer で中身を見る', () => {
  it('「この箇所を開く」で該当 operation の Drawer が開く', async () => {
    const { screen } = await mountManifest();
    await fireEvent.click(screen.getAllByRole('button', { name: /この箇所を開く/ })[0]);
    await tick();

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-label')).toBe(RECEIVE_KEY);
  });

  it('Drawer に 3 ルートすべてが出る', async () => {
    // 1 関数が複数の外部ルートへ展開されることが読み取れる必要がある。
    const { screen } = await mountManifest();
    await fireEvent.click(screen.getAllByRole('button', { name: /この箇所を開く/ })[0]);
    await tick();

    const dialog = screen.getByRole('dialog');
    for (const id of ['createDocument', 'updateDocument', 'cancelDocument']) {
      expect(dialog.textContent).toContain(id);
    }
  });

  it('未 bind の引数が Drawer で判別できる', async () => {
    // publicRoutes[1] の p_payload は bind されていない。compile が止まる原因。
    const { screen } = await mountManifest();
    await fireEvent.click(screen.getAllByRole('button', { name: /この箇所を開く/ })[0]);
    await tick();

    expect(screen.getByRole('dialog').textContent).toContain('未 bind');
  });

  it('フォームと JSON を切り替えられる', async () => {
    const { screen } = await mountManifest();
    await fireEvent.click(screen.getAllByRole('button', { name: /この箇所を開く/ })[0]);
    await tick();

    await fireEvent.click(screen.getByRole('button', { name: 'JSON' }));
    await tick();
    expect(screen.getByRole('dialog').textContent).toContain('"operationId": "receiveDocument"');
  });

  it('閉じるで Drawer が消える', async () => {
    const { screen } = await mountManifest();
    await fireEvent.click(screen.getAllByRole('button', { name: /この箇所を開く/ })[0]);
    await tick();
    expect(screen.queryByRole('dialog')).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    await tick();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('シナリオ: 検証に落ちた保存は保存されていないと分かる', () => {
  it('失敗したら理由と「保存されていない」旨が出る', async () => {
    // 成功として扱うと、書き出していない下書きを保存済みと誤表示する。
    const { screen, viewModel } = await mountManifest(true);
    const saved = await viewModel.save();
    await tick();

    expect(saved).toBe(false);
    expect(screen.getByText(/has 1 error\(s\)/)).toBeTruthy();
    expect(screen.getByText(/保存されていません/)).toBeTruthy();
  });
});
