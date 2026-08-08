import { expect, type Page } from '@playwright/test';

/**
 * 画面遷移はルート名で行う。表示文言はロケールと文言変更で変わるため、
 * セレクタの根拠にしない。data-nav はサイドバーがルート名をそのまま出している。
 */
export async function gotoPage(page: Page, route: string): Promise<void> {
  await page.locator(`[data-testid="nav"][data-nav="${route}"]`).click();
}

/** マニフェスト一覧を開き、そのスキーマの行の Drawer まで進む。 */
export async function openManifestDrawer(page: Page, schema: string): Promise<void> {
  await gotoPage(page, 'manifest');
  await page.locator(`[data-testid="manifest-row"][data-schema="${schema}"] button`).first().click();
  await expect(page.locator(`[data-testid="manifest-drawer"][data-schema="${schema}"]`)).toBeVisible();
}

/** オペレーション一覧をそのスキーマで開く。 */
export async function openOperations(page: Page, schema: string): Promise<void> {
  await gotoPage(page, 'manifestOperations');
  await page.locator('[data-testid="schema-filter"]').selectOption(schema);
  await expect(page.locator('[data-testid="operation-row"]').first()).toBeVisible();
}

/** profile タブを切り替える。表示文言ではなく profile 名で選ぶ。 */
export async function selectProfile(page: Page, profile: 'postgrest' | 'bff'): Promise<void> {
  await page.getByRole('button', { name: profile, exact: true }).click();
  await expect(page.locator(`[data-testid="profile-hint"][data-profile="${profile}"]`)).toBeVisible();
}
