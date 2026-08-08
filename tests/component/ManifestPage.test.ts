import { render, fireEvent, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, it, expect, afterEach } from 'vitest';
import ManifestPage from '@/pages/ManifestPage.svelte';
import ManifestOperationPage from '@/pages/ManifestOperationPage.svelte';
import SchemaPage from '@/pages/SchemaPage.svelte';
import { ManifestViewModel } from '@/modules/manifest/viewmodels/ManifestViewModel.svelte';
import { ManifestService } from '@/modules/manifest/services/ManifestService';
import { SchemaViewModel } from '@/modules/schema/viewmodels/SchemaViewModel.svelte';
import { SchemaService } from '@/modules/schema/services/SchemaService';
import { GenerationViewModel } from '@/modules/generation/viewmodels/GenerationViewModel.svelte';
import { GenerationService } from '@/modules/generation/services/GenerationService';
import type { ISchemaRepository } from '@/modules/schema/repositories/SchemaRepository';
import type { SchemaSummary } from '@/modules/schema/types/SchemaSummary';
import { ok, type Result } from '@/shared/result/Result';
import { FakeManifestRepository } from '../unit/ManifestRepositoryFake';
import {
  diagnosticCount,
  fixture,
  operationWithMostRoutes,
  routeCount,
  schemaNames,
  schemaWithMostRoutes,
  schemaWithUndeclared,
  undeclaredFunction
} from '../fixtures';

/**
 * ページが「何を並べるか」だけを確かめる。
 *
 * 行の描き方・選択欄の出し方・バッジの形は ListRow が持ち、SharedComponents で
 * 1 度だけ確かめている。宣言をどう変えるかの判断は ManifestViewModel が持ち、
 * tests/unit で確かめている。ここで同じことを繰り返さない。
 */
const SCHEMA = schemaWithMostRoutes();
const TARGET = operationWithMostRoutes(SCHEMA);
const MANIFEST = fixture.manifests[SCHEMA];

afterEach(cleanup);

class FakeSchemaRepository implements ISchemaRepository {
  async listSchemas(): Promise<Result<SchemaSummary[]>> {
    return ok(
      fixture.list_schemas.map((s) => ({
        name: s.schemaName,
        comment: s.comment,
        tableCount: s.tableCount,
        viewCount: s.viewCount
      }))
    );
  }
}

function testids(root: ParentNode, testid: string, extra = ''): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[data-testid="${testid}"]${extra}`));
}

function only(root: ParentNode, testid: string, extra = ''): HTMLElement {
  const found = testids(root, testid, extra);
  expect(found.length).toBeGreaterThan(0);
  return found[0];
}

function schemaList(): { name: string; comment: string | null }[] {
  return fixture.list_schemas.map((s) => ({ name: s.schemaName, comment: s.comment }));
}

describe('スキーマ一覧', () => {
  it('マニフェストの有無だけを出し、宣言の件数は出さない', async () => {
    // 何件埋まっているかはマニフェストの責務。ここには持ち込まない。
    const manifestViewModel = new ManifestViewModel(new ManifestService(new FakeManifestRepository()));
    const schemaViewModel = new SchemaViewModel(new SchemaService(new FakeSchemaRepository()));
    await schemaViewModel.loadSchemas();
    await manifestViewModel.loadOverviews(schemaList());

    const { container } = render(SchemaPage, {
      props: { viewModel: schemaViewModel, manifestViewModel }
    });
    await tick();

    expect(testids(container, 'coverage')).toHaveLength(0);
    expect(testids(container, 'schema-row')).toHaveLength(schemaNames.length);
    for (const name of schemaNames) {
      const row = only(container, 'schema-row', `[data-schema="${name}"]`);
      expect(only(row, 'manifest-state').dataset.state).toBe(fixture.manifests[name] ? 'present' : 'absent');
    }
  });
});

describe('マニフェスト一覧', () => {
  async function mount() {
    const viewModel = new ManifestViewModel(new ManifestService(new FakeManifestRepository()));
    await viewModel.loadOverviews(schemaList());
    const { container } = render(ManifestPage, {
      props: {
        viewModel,
        generationViewModel: new GenerationViewModel(new GenerationService()),
        onOpenOperations: () => {}
      }
    });
    await tick();
    return { container, viewModel };
  }

  it('スキーマごとに 1 行、状態と profile と診断件数を並べる', async () => {
    const { container } = await mount();
    expect(testids(container, 'manifest-row')).toHaveLength(schemaNames.length);

    for (const name of schemaNames) {
      const row = only(container, 'manifest-row', `[data-schema="${name}"]`);
      expect(only(row, 'manifest-state').dataset.state).toBe('present');
      expect(testids(row, 'manifest-profile').map((el) => el.dataset.profile).sort()).toEqual(
        Object.keys(fixture.manifests[name].profiles).sort()
      );

      for (const severity of ['error', 'warning']) {
        const badge = testids(row, 'manifest-diagnostic-count', `[data-severity="${severity}"]`);
        const expected = diagnosticCount(name, severity);
        if (expected === 0) expect(badge).toHaveLength(0);
        else expect(badge[0].dataset.count).toBe(String(expected));
      }
    }
  });
});

describe('オペレーション一覧', () => {
  async function mount(schemaName = SCHEMA) {
    const viewModel = new ManifestViewModel(new ManifestService(new FakeManifestRepository()));
    await viewModel.load(schemaName);
    // 一覧は全スキーマ横断。編集は開いた行のスキーマへ切り替える。
    await viewModel.loadCatalog([schemaName]);
    const { container } = render(ManifestOperationPage, {
      props: { viewModel, schemas: schemaList(), initialSchema: schemaName }
    });
    await tick();
    return { container, viewModel };
  }

  it('カタログの公開関数をすべて並べ、宣言の状態を出す', async () => {
    // 宣言済みだけに絞らないのは、公開し忘れを一覧の中で見つけられるようにするため。
    const { container } = await mount();
    expect(testids(container, 'operation-row')).toHaveLength(fixture.functions[SCHEMA].length);

    for (const fn of fixture.functions[SCHEMA]) {
      const row = only(container, 'operation-row', `[data-operation="${fn.functionKey}"]`);
      expect(only(row, 'declared-state').dataset.state).toBe(fn.state);
      expect(row.dataset.routes).toBe(String(routeCount(MANIFEST, fn.functionKey)));
    }
  });

  it('説明は宣言が無ければ関数の COMMENT を出す', async () => {
    // 説明を二重管理させない。空欄を並べても読めない。
    const withComment = fixture.functions[SCHEMA].find((fn) => (fn.comment ?? '').trim().length > 0);
    if (!withComment) return;

    const { container } = await mount();
    const declared = MANIFEST.operations[withComment.functionKey] as { description?: string } | undefined;
    const expected = declared?.description ?? withComment.comment ?? '';
    const row = only(container, 'operation-row', `[data-operation="${withComment.functionKey}"]`);
    expect(row.textContent).toContain(expected.slice(0, 20));
  });

  it('編集画面には宣言できる項目がすべて並び、由来が付く', async () => {
    // 画面は rv_meta.manifest_fields() を描くだけ。項目の一覧を自分で持たない。
    const { container } = await mount();
    only(container, 'edit-operation', `[data-operation="${TARGET.key}"]`).click();
    await tick();

    const drawer = only(container, 'operation-drawer');
    // 既定は「触った項目だけ」。全項目へ切り替えると定義の数だけ並ぶ。
    await fireEvent.click(only(drawer, 'show-all'));
    await tick();

    const expected = fixture.fields.filter((f) => f.level === 'operation').map((f) => f.field);
    const table = only(drawer, 'operation-fields');
    expect(testids(table, 'field-row').map((el) => el.dataset.field)).toEqual(expected);
    // 由来はすべての行に付く。どこから来た値なのかが分からないと直せない。
    expect(testids(table, 'field-source').every((el) => (el.dataset.source ?? '').length > 0)).toBe(true);
  });

  it('宣言が無い関数でも全項目が埋まる（人の入力 0 で宣言できる）', async () => {
    const schema = schemaWithUndeclared();
    if (!schema) return;
    const fn = undeclaredFunction(schema)!;
    const { container } = await mount(schema);

    only(container, 'edit-operation', `[data-operation="${fn.functionKey}"]`).click();
    await tick();
    const drawer = only(container, 'operation-drawer');
    await fireEvent.click(only(drawer, 'show-all'));
    await tick();

    // 未設定のまま残るのは任意の項目だけ。必須が空なら compile が止まるので、
    // 「そのまま宣言できる」が成り立たない。
    const unset = testids(drawer, 'field-row', '[data-source="none"]').map((el) => el.dataset.field);
    const required = fixture.fields
      .filter((f) => f.level === 'operation' && f.isRequired)
      .map((f) => f.field);
    expect(unset.filter((field) => required.includes(field ?? ''))).toEqual([]);
    // 公開は業務判断なので、publicRoutes は未設定のままにする。
    expect(unset).toContain('publicRoutes');
  });
});
