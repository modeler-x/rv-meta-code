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
    await page.locator('[data-testid="declare-operation"]').click();

    // 宣言できたので編集フォームに変わる。security は要認証が既定（fail-closed）。
    await expect(page.locator('[data-testid="operation-field"][data-field="operationId"]')).toBeVisible();
    await expect(page.locator('[data-testid="operation-field"][data-field="security"]')).toHaveValue('bearer');

    await page.locator('[data-testid="save-manifest"]').click();
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
    await expect(row).toHaveAttribute('data-routes', '1');
    await page.locator(`[data-testid="edit-operation"][data-operation="${key}"]`).click();
    const required = functionOf(schemaName!, key)!.arguments.filter((a) => a.required);
    for (const argument of required) {
      await expect(
        page.locator(`[data-testid="bind"][data-arg="${argument.name}"]`).first()
      ).toHaveAttribute('data-kind', 'body');
    }
  });

});
