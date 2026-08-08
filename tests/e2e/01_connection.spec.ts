import { test, expect } from '@playwright/test';
import { installTauriStub, calls } from './stub';
import { gotoPage } from './nav';

/**
 * 接続設定。ここを通らないと他のページはどのサーバーを見ているか決まらない。
 * 検証の中心は「選んだ接続が以降のページへ効くこと」。
 *
 * セレクタは data-testid、期待値はスタブが返す接続一覧から導出する。
 * 表示文言も接続名もテストに書かない。
 */
test.describe('接続設定', () => {
  test.beforeEach(async ({ page }) => {
    await installTauriStub(page);
    await page.goto('/');
    await gotoPage(page, 'connections');
  });

  test('登録済みの接続がすべて行として出る', async ({ page }) => {
    const rows = page.locator('[data-testid="connection-row"]');
    await expect(rows).toHaveCount(2);

    // 現在の接続はちょうど 1 件。0 件だとどのサーバーを見ているか決まらない。
    await expect(page.locator('[data-testid="connection-row"][data-current="true"]')).toHaveCount(1);
    await page.screenshot({ path: 'tests/e2e/artifacts/01-connections.png', fullPage: true });
  });

  test('接続テストが IPC まで届く', async ({ page }) => {
    await page.locator('[data-testid="connection-row"]').first().click();
    await page.locator('[data-testid="test-connection"]').click();

    await expect
      .poll(async () => (await calls(page)).some((c) => c.command === 'test_connection'))
      .toBe(true);
  });

  test('現在でない接続へ切り替えると、その接続でカタログを読み直す', async ({ page }) => {
    const other = page.locator('[data-testid="set-active"]').first();
    await other.click();
    await expect
      .poll(async () => (await calls(page)).some((c) => c.command === 'set_active_connection'))
      .toBe(true);

    const before = (await calls(page)).filter((c) => c.command === 'list_schemas').length;
    await gotoPage(page, 'schema');
    await expect
      .poll(async () => (await calls(page)).filter((c) => c.command === 'list_schemas').length)
      .toBeGreaterThan(before);
  });
});
