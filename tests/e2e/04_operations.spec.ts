import { test, expect } from '@playwright/test';
import { installTauriStub, calls } from './stub';
import { openOperations, selectProfile } from './nav';
import {
  fixture,
  functionOf,
  operationWithMostRoutes,
  routeCount,
  schemaWithMostRoutes,
  schemaWithoutRoutes,
  schemaWithUndeclared,
  undeclaredFunction
} from '../fixtures';

/**
 * オペレーション。関数 1 本ごとの宣言を編集する。
 *
 * 対象は「名前」ではなく「性質」で選ぶ。BFF ルートを最も多く持つスキーマ、
 * 宣言の無い関数を持つスキーマ、という選び方にすることで、名前が変わっても通る。
 */
const schema = schemaWithMostRoutes();
const target = operationWithMostRoutes(schema);
const manifest = fixture.manifests[schema];

test.describe('オペレーション', () => {
  test.beforeEach(async ({ page }) => {
    await installTauriStub(page);
    await page.goto('/');
    await openOperations(page, schema);
  });

  test('スキーマのドロップダウンは無く、絞り込みは検索窓で行う', async ({ page }) => {
    await expect(page.locator('[data-testid="schema-filter"]')).toHaveCount(0);
    // マニフェストからの遷移は検索語として渡る。
    await expect(page.getByRole('textbox').first()).toHaveValue(schema);
  });

  test('行にスキーマと operationId が出て、引数は型だけで表す', async ({ page }) => {
    const manifest = fixture.manifests[schema];
    const declared = Object.keys(manifest.operations)[0];
    const row = page.locator(`[data-testid="operation-row"][data-operation="${declared}"]`);

    await expect(row).toContainText(schema);
    const operationId = (manifest.operations[declared] as { operationId?: string }).operationId;
    if (operationId) await expect(row).toContainText(operationId);
    // receive(p_payload jsonb, p_operation text) ではなく receive(jsonb, text)。
    await expect(row).not.toContainText('p_');
  });

  test('選んだ operation へ項目をまとめて設定できる', async ({ page }) => {
    // 1500 件を 1 件ずつ開くのは現実的ではない。
    const keys = Object.keys(fixture.manifests[schema].operations).slice(0, 2);
    for (const key of keys) {
      await page.locator(`[data-testid="operation-row"][data-operation="${key}"] [data-testid="operation-row-select"]`).check();
    }
    await page.locator('[data-testid="bulk-set-field"]').click();

    const dialog = page.locator('[data-testid="bulk-dialog"]');
    await expect(dialog).toHaveAttribute('data-count', String(keys.length));
    await dialog.locator('[data-testid="bulk-field"]').selectOption('tags');
    await dialog.locator('[data-testid="bulk-value"]').fill('Bulk');
    await dialog.locator('[data-testid="bulk-scope"]').selectOption('defaults');
    await dialog.locator('[data-testid="bulk-apply"]').click();

    await page.locator('[data-testid="save-manifest"]').first().click();
    await expect
      .poll(async () => {
        const saved = (await calls(page)).filter((c) => c.command === 'load_manifest').pop();
        return (saved?.args as { manifest?: { defaults?: { tags?: string[] } } })?.manifest?.defaults?.tags;
      })
      .toEqual(['Bulk']);
  });

  test('bff タブでは公開と非公開が分かる', async ({ page }) => {
    await selectProfile(page, 'bff');

    // bff は公開の判断が済んでいるもの（宣言済み）だけを扱う。
    const declared = Object.keys(manifest.operations);
    await expect(page.locator('[data-testid="operation-row"]')).toHaveCount(declared.length);

    for (const key of declared) {
      const row = page.locator(`[data-testid="operation-row"][data-operation="${key}"]`);
      await expect(row).toHaveAttribute('data-routes', String(routeCount(manifest, key)));
      await expect(row.locator('[data-testid="public-state"]')).toHaveAttribute(
        'data-public',
        String(routeCount(manifest, key) > 0)
      );
    }
    await page.screenshot({ path: 'tests/e2e/artifacts/07-operations-bff.png', fullPage: true });
  });

  test('編集画面は全項目を有効値と由来つきで並べる', async ({ page }) => {
    // 空欄を並べない。人が設定する項目は 0 でも成立する。
    await page.locator(`[data-testid="edit-operation"][data-operation="${target.key}"]`).click();
    const drawer = page.locator('[data-testid="operation-drawer"]');
    await drawer.locator('[data-testid="show-all"]').click();

    const expected = fixture.fields.filter((f) => f.level === 'operation').length;
    const table = drawer.locator('[data-testid="operation-fields"]');
    await expect(table.locator('[data-testid="field-row"]')).toHaveCount(expected);
    await expect(table.locator('[data-testid="field-source"]').first()).toHaveAttribute('data-source', /.+/);
  });

  test('上書きは範囲を選んで書き、戻すと継承へ返る', async ({ page }) => {
    await page.locator(`[data-testid="edit-operation"][data-operation="${target.key}"]`).click();
    const drawer = page.locator('[data-testid="operation-drawer"]');
    await drawer.locator('[data-testid="show-all"]').click();

    const row = drawer.locator('[data-testid="field-row"][data-field="operationGroup"]');
    await row.locator('[data-testid="field-edit"]').click();
    await row.locator('[data-testid="field-input"]').fill('Changed');
    await row.locator('[data-testid="field-scope"]').selectOption('own');
    await row.locator('[data-testid="field-commit"]').click();

    // 上書きすると由来が own になる。
    await expect(drawer.locator('[data-testid="field-row"][data-field="operationGroup"]'))
      .toHaveAttribute('data-source', 'own');

    await drawer.locator('[data-testid="field-row"][data-field="operationGroup"] [data-testid="field-clear"]').click();
    await drawer.locator('[data-testid="show-all"]').click();
    await expect(drawer.locator('[data-testid="field-row"][data-field="operationGroup"]'))
      .not.toHaveAttribute('data-source', 'own');
  });

  test('bind の行は関数の引数から並ぶ', async ({ page }) => {
    test.skip(target.routes === 0, '公開ルートを持つ operation がフィクスチャに無い');

    await selectProfile(page, 'bff');
    await page.locator(`[data-testid="edit-operation"][data-operation="${target.key}"]`).click();
    const drawer = page.locator('[data-testid="operation-drawer"]');
    await expect(drawer).toBeVisible();

    // 引数名を人に打たせないための表示。行は pg_proc の並びで出る。
    const args = functionOf(schema, target.key)!.arguments;
    const firstRoute = drawer.locator('[data-testid="route"]').first();
    await expect(firstRoute.locator('[data-testid="bind"]')).toHaveCount(args.length);
    for (const argument of args) {
      const bind = firstRoute.locator(`[data-testid="bind"][data-arg="${argument.name}"]`);
      await expect(bind).toHaveAttribute('data-required', String(argument.required));
    }

    // 宣言どおりの bind 種別が選ばれている。
    const routes = manifest.operations[target.key].publicRoutes ?? [];
    for (const [argument, rule] of Object.entries(routes[0].bind ?? {})) {
      const kind = rule.const !== undefined ? 'const' : (rule.from ?? 'unbound');
      await expect(firstRoute.locator(`[data-testid="bind"][data-arg="${argument}"]`)).toHaveAttribute('data-kind', kind);
    }
    await page.screenshot({ path: 'tests/e2e/artifacts/08-operation-edit.png', fullPage: true });
  });

  test('宣言の無い関数に宣言を足せる', async ({ page }) => {
    const schemaName = schemaWithUndeclared();
    test.skip(!schemaName, '未宣言の関数を持つスキーマがフィクスチャに無い');
    const fn = undeclaredFunction(schemaName!)!;

    await openOperations(page, schemaName!);
    await page.locator(`[data-testid="edit-operation"][data-operation="${fn.functionKey}"]`).click();
    const drawer = page.locator('[data-testid="operation-drawer"]');
    await drawer.locator('[data-testid="show-all"]').click();

    // 人の入力 0 で宣言できる。必須項目が未設定のまま残らないこと。
    const table = drawer.locator('[data-testid="operation-fields"]');
    const unset = table.locator('[data-testid="field-row"][data-source="none"]');
    const unsetFields = await unset.evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLElement).dataset.field));
    const required = fixture.fields
      .filter((f) => f.level === 'operation' && f.isRequired)
      .map((f) => f.field);
    expect(unsetFields.filter((field) => required.includes(field ?? ''))).toEqual([]);

    // 1 回目で宣言が入り、2 回目で保存する。Drawer を閉じずに完結させる。
    await drawer.locator('[data-testid="save-manifest"]').click();
    await drawer.locator('[data-testid="save-manifest"]').click();
    await expect
      .poll(async () => {
        const saved = (await calls(page)).filter((c) => c.command === 'load_manifest').pop();
        const manifest = (saved?.args as { manifest?: { operations?: Record<string, unknown> } })?.manifest;
        return Object.keys(manifest?.operations ?? {});
      })
      .toContain(fn.functionKey);
  });

  test('選んだ関数をまとめて BFF へ公開できる', async ({ page }) => {
    // 公開ルートを 1 本も持たないスキーマで確かめる。公開前から公開後への変化を見たいため。
    const schemaName = schemaWithoutRoutes();
    test.skip(!schemaName, '未公開のスキーマがフィクスチャに無い');
    const target = fixture.manifests[schemaName!];
    const key = Object.keys(target.operations)[0];

    await openOperations(page, schemaName!);
    await selectProfile(page, 'bff');
    const row = page.locator(`[data-testid="operation-row"][data-operation="${key}"]`);
    await row.locator('[data-testid="operation-row-select"]').check();
    await page.locator('[data-testid="bulk-publish"]').click();

    // 1 本のルートができ、DEFAULT を持たない引数は body に置かれる。
    await page.locator(`[data-testid="edit-operation"][data-operation="${key}"]`).click();
    const required = functionOf(schemaName!, key)!.arguments.filter((a) => a.required);
    for (const argument of required) {
      await expect(
        page.locator(`[data-testid="bind"][data-arg="${argument.name}"]`).first()
      ).toHaveAttribute('data-kind', 'body');
    }
  });

});
