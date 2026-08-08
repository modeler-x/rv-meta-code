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
});
