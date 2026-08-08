import { test, expect } from '@playwright/test';
import { installTauriStub, calls } from './stub';
import { gotoPage } from './nav';
import { fixture, schemaNames } from '../fixtures';

/**
 * スキーマ。管理対象にするかどうかと、OpenAPI を生成するかどうかだけを決める。
 * 宣言の中身は扱わないので、宣言の件数もここには出さない。
 */
test.describe('スキーマ', () => {
  test.beforeEach(async ({ page }) => {
    await installTauriStub(page);
    await page.goto('/');
    await gotoPage(page, 'schema');
  });

  test('取得したスキーマがすべて行として出る', async ({ page }) => {
    await expect(page.locator('[data-testid="schema-row"]')).toHaveCount(schemaNames.length);
    for (const name of schemaNames) {
      await expect(page.locator(`[data-testid="schema-row"][data-schema="${name}"]`)).toBeVisible();
    }
    await page.screenshot({ path: 'tests/e2e/artifacts/02-schema.png', fullPage: true });
  });

  test('マニフェストの有無だけがラベルとして出る', async ({ page }) => {
    // 宣言が何件埋まっているかはマニフェストの責務。ここには持ち込まない。
    for (const name of schemaNames) {
      const row = page.locator(`[data-testid="schema-row"][data-schema="${name}"]`);
      const expected = fixture.manifests[name] ? 'present' : 'absent';
      await expect(row.locator('[data-testid="manifest-state"]')).toHaveAttribute('data-state', expected);
      await expect(row.locator('[data-testid="coverage"]')).toHaveCount(0);
    }
  });

  test('行の「開く」はマニフェストへ移動するだけで、宣言を作らない', async ({ page }) => {
    const target = schemaNames[schemaNames.length - 1];
    await page.locator(`[data-testid="schema-row"][data-schema="${target}"] [data-testid="open-manifest"]`).click();

    await expect(page.locator(`[data-testid="manifest-row"][data-schema="${target}"]`)).toBeVisible();
    expect((await calls(page)).some((c) => c.command === 'draft_manifest')).toBe(false);
    expect((await calls(page)).some((c) => c.command === 'load_manifest')).toBe(false);
  });

  test('生成の操作は置かない（manifest の有無を知らない画面だから）', async ({ page }) => {
    // 押してからエラーで気づくのではなく、そもそも置かない。
    await expect(page.locator('[data-testid="generate-openapi"]')).toHaveCount(0);
  });

  test('作る前に何が起きるかを示し、終わったら次の工程へ渡す', async ({ page }) => {
    // 押しても何も起きないように見える操作を作らない。
    const target = schemaNames[0];
    await page.locator(`[data-testid="schema-row"][data-schema="${target}"] [data-testid="schema-row-select"]`).check();
    await page.locator('[data-testid="draft-manifest"]').click();

    const sheet = page.locator('[data-testid="task-sheet"]');
    await expect(sheet).toHaveAttribute('data-state', 'confirm');
    await sheet.locator('[data-testid="task-run"]').click();

    await expect(sheet).toHaveAttribute('data-state', 'done');
    await expect
      .poll(async () =>
        (await calls(page))
          .filter((c) => c.command === 'load_manifest')
          .map((c) => (c.args as { schemaName: string }).schemaName))
      .toContain(target);

    // 結果から次の工程へ。戻ってナビを押し直させない。
    await sheet.locator('[data-testid="task-next"]').click();
    await expect(page.locator(`[data-testid="manifest-row"][data-schema="${target}"]`)).toBeVisible();
  });

  test('変化が無いときは、無いと言う', async ({ page }) => {
    // 宣言が揃っているスキーマでは中身が変わらない。それを黙って実行しない。
    const target = schemaNames.find(
      (name) => fixture.manifests[name] && !(fixture.coverage[name] ?? []).some((c) => c.state === 'undeclared')
    );
    test.skip(!target, '宣言が揃ったスキーマがフィクスチャに無い');

    await page.locator(`[data-testid="schema-row"][data-schema="${target}"] [data-testid="schema-row-select"]`).check();
    await page.locator('[data-testid="draft-manifest"]').click();

    const sheet = page.locator('[data-testid="task-sheet"]');
    await expect(sheet.locator('[data-testid="task-plan"]')).toHaveCount(0);
    await expect(sheet.locator('[data-testid="task-empty"]')).toBeVisible();
  });
});
