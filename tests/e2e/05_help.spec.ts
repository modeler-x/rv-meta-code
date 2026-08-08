import { test, expect } from '@playwright/test';
import { installTauriStub } from './stub';
import { gotoPage, openOperations } from './nav';
import { operationWithMostRoutes, schemaWithMostRoutes } from '../fixtures';

/**
 * ヘルプ。md を索引とページに分けて出し、全文検索で引ける。
 * 期待値はページ ID から導出する。文言も件数もテストに書かない。
 */
test.describe('ヘルプ', () => {
  test.beforeEach(async ({ page }) => {
    await installTauriStub(page);
    await page.goto('/');
    await gotoPage(page, 'help');
  });

  test('目次が出て、選んだページが表示される', async ({ page }) => {
    const index = page.locator('[data-testid="help-index"]');
    const count = await index.count();
    expect(count).toBeGreaterThan(1);

    // 目次の各項目が、その ID のページを開くこと。
    for (let i = 0; i < count; i += 1) {
      const item = index.nth(i);
      const id = await item.getAttribute('data-page');
      await item.click();
      await expect(page.locator('[data-testid="help-body"]')).toHaveAttribute('data-page', id!);
    }
    await page.screenshot({ path: 'tests/e2e/artifacts/09-help.png', fullPage: true });
  });

  test('全文検索でページを引ける', async ({ page }) => {
    // 本文にしか出ない語で引く。目次のタイトルには現れない。
    await page.getByRole('textbox').first().fill('bind');
    const hits = page.locator('[data-testid="help-hit"]');
    await expect(hits.first()).toBeVisible();

    const id = await hits.first().getAttribute('data-page');
    await hits.first().click();
    await expect(page.locator('[data-testid="help-body"]')).toHaveAttribute('data-page', id!);
  });

  test('本文中のリンクでページを移動できる', async ({ page }) => {
    await page.locator('[data-testid="help-index"]').first().click();
    const link = page.locator('[data-testid="help-body"] a[data-help-link]').first();
    const targetId = await link.getAttribute('data-help-link');
    await link.click();
    await expect(page.locator('[data-testid="help-body"]')).toHaveAttribute('data-page', targetId!);
  });
});

test.describe('編集画面からヘルプへ', () => {
  test('書式の説明はヘルプへ集約し、そこへ飛べる', async ({ page }) => {
    // 書式はスキーマごとに変わらないので、編集画面には置かず導線だけを持つ。
    await installTauriStub(page);
    await page.goto('/');
    const schema = schemaWithMostRoutes();
    await openOperations(page, schema);
    await page.locator(`[data-testid="edit-operation"][data-operation="${operationWithMostRoutes(schema).key}"]`).click();

    const link = page.locator('[data-testid="open-help"]');
    const targetPage = await link.getAttribute('data-help-page');
    await link.click();
    await expect(page.locator('[data-testid="help-body"]')).toHaveAttribute('data-page', targetPage!);
  });
});
