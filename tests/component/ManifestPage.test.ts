import { render, cleanup } from '@testing-library/svelte';
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
  schemaWithMostRoutes
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
      props: {
        viewModel: schemaViewModel,
        generationViewModel: new GenerationViewModel(new GenerationService()),
        manifestViewModel
      }
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
    const { container } = render(ManifestPage, { props: { viewModel, onOpenOperations: () => {} } });
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

  it('編集する項目は宣言の並びどおりに出る', async () => {
    // 何を編集できるかがページの責務。入力欄の描き方は Field が持つ。
    const { container } = await mount();
    only(container, 'edit-operation', `[data-operation="${TARGET.key}"]`).click();
    await tick();

    const drawer = only(container, 'operation-drawer');
    expect(testids(drawer, 'operation-field').map((el) => el.dataset.field)).toEqual([
      'operationId',
      'operationGroup',
      'tags',
      'security',
      // description は関数 COMMENT を取り込むボタンを持つので、宣言配列ではなく個別に置く。
      'description'
    ]);
  });
});
