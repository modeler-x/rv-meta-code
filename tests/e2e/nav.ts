import { expect, type Page } from '@playwright/test';

/**
 * 画面遷移はルート名で行う。表示文言はロケールと文言変更で変わるため、
 * セレクタの根拠にしない。data-nav はサイドバーがルート名をそのまま出している。
 */
export async function gotoPage(page: Page, route: string): Promise<void> {
  await page.locator(`[data-testid="nav"][data-nav="${route}"]`).click();
}

/**
 * マニフェスト一覧を開き、そのスキーマの診断 Drawer まで進む。
 * 行の本体は次の工程（オペレーション）へ進む導線なので、Drawer は「診断」から開く。
 */
export async function openManifestDrawer(page: Page, schema: string): Promise<void> {
  await gotoPage(page, 'manifest');
  await page
    .locator(`[data-testid="manifest-row"][data-schema="${schema}"] [data-testid="open-settings"]`)
    .click();
  await expect(page.locator(`[data-testid="manifest-drawer"][data-schema="${schema}"]`)).toBeVisible();
}

/** 診断は複数スキーマをまとめて見るもの。行を選んで一括操作から開く。 */
export async function openDiagnostics(page: Page, schema: string): Promise<void> {
  await gotoPage(page, 'manifest');
  await page.locator(`[data-testid="manifest-row"][data-schema="${schema}"] [data-testid="manifest-row-select"]`).check();
  await page.locator('[data-testid="show-diagnostics"]').click();
  await expect(page.locator('[data-testid="diagnostics-drawer"]')).toBeVisible();
}

/**
 * オペレーション一覧をそのスキーマで開く。
 * スキーマの選択はドロップダウンではなく検索語。マニフェストからの遷移も同じ形で渡す。
 */
export async function openOperations(page: Page, schema: string): Promise<void> {
  await gotoPage(page, 'manifest');
  await page
    .locator(`[data-testid="manifest-row"][data-schema="${schema}"] [data-testid="open-operations"]`)
    .click();
  await expect(page.locator('[data-testid="operation-row"]').first()).toBeVisible();
}

/** profile タブを切り替える。表示文言ではなく profile 名で選ぶ。 */
export async function selectProfile(page: Page, profile: 'postgrest' | 'bff'): Promise<void> {
  await page.getByRole('button', { name: profile, exact: true }).click();
  await expect(page.locator(`[data-testid="profile-hint"][data-profile="${profile}"]`)).toBeVisible();
}
