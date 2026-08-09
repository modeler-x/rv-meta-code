import { test, expect } from '@playwright/test';
import { installTauriStub, calls } from './stub';
import { gotoPage, openDiagnostics, openManifestDrawer } from './nav';
import {
  diagnosticCount,
  fixture,
  functionKeyOf,
  jumpableDiagnostic,
  schemaNames,
  schemaWithDiagnostics
} from '../fixtures';

/**
 * マニフェスト。1 行が 1 スキーマで、診断とスキーマ単位の設定を持つ。
 * 期待値はすべて tests/fixtures/dev.json から導出する。
 */
test.describe('マニフェスト', () => {
  test.beforeEach(async ({ page }) => {
    await installTauriStub(page);
    await page.goto('/');
    await gotoPage(page, 'manifest');
  });

  test('診断からオペレーションの編集へ飛べる', async ({ page }) => {
    const schema = schemaWithDiagnostics();
    const diagnostic = schema ? jumpableDiagnostic(schema) : null;
    test.skip(!diagnostic, 'operation を指す診断がフィクスチャに無い');

    await openDiagnostics(page, schema!);
    await page.locator(`[data-testid="diagnostic-jump"][data-code="${diagnostic!.code}"]`).first().click();

    // 飛んだ先がその関数のオペレーション編集であること。
    const key = functionKeyOf(diagnostic!.location)!;
    await expect(page.locator(`[data-testid="operation-drawer"][data-operation="${key}"]`)).toBeVisible();
  });

  test('profiles の有無と中身を編集できる', async ({ page }) => {
    // profile を持たないスキーマに bff を足す。既定が入るので入力は要らない。
    const target = schemaNames.find((name) => !fixture.manifests[name].profiles.bff);
    test.skip(!target, 'bff を持たないスキーマがフィクスチャに無い');

    await openManifestDrawer(page, target!);
    await page.getByRole('button', { name: 'profiles', exact: true }).click();
    await expect(page.locator('[data-testid="profile-row"][data-profile="bff"]')).toHaveAttribute('data-present', 'false');

    await page.locator('[data-testid="profile-toggle"][data-profile="bff"]').check();
    await expect(page.locator('[data-testid="profile-row"][data-profile="bff"]')).toHaveAttribute('data-present', 'true');
    // 足しただけで未保存として出る。
    await expect(page.locator('[data-testid="dirty"]')).toHaveAttribute('data-dirty', 'true');

    // 項目は「有効値 + 由来」で並ぶ。上書きしたいものだけ触る。
    const table = page.locator('[data-testid="profile-fields"][data-profile="bff"]');
    await table.locator('[data-testid="show-all"]').click();
    const row = table.locator('[data-testid="field-row"][data-field="basePath"]');
    await row.locator('[data-testid="field-edit"]').click();
    await row.locator('[data-testid="field-input"]').fill('external');
    await row.locator('[data-testid="field-commit"]').click();
    await expect(table.locator('[data-testid="field-row"][data-field="basePath"]'))
      .toHaveAttribute('data-source', 'own');

    await page.locator('[data-testid="save-manifest"]').click();

    await expect
      .poll(async () => {
        const saved = (await calls(page)).filter((c) => c.command === 'load_manifest').pop();
        const manifest = (saved?.args as { manifest?: { profiles?: Record<string, { basePath?: string }> } })?.manifest;
        return manifest?.profiles?.bff?.basePath;
      })
      .toBe('external');
  });

  test('検証に落ちた保存は「保存されていない」と出る', async ({ page }) => {
    // 成功として扱うと、書き出していない下書きを保存済みと誤表示する。
    await installTauriStub(page, { rejectLoadManifest: true });
    await page.goto('/');
    const schema = schemaNames[0];
    await openManifestDrawer(page, schema);

    await page.getByRole('button', { name: 'defaults', exact: true }).click();
    const table = page.locator('[data-testid="defaults-fields"]');
    const row = table.locator('[data-testid="field-row"][data-field="operationGroup"]');
    await row.locator('[data-testid="field-edit"]').click();
    await row.locator('[data-testid="field-input"]').fill('Changed');
    await row.locator('[data-testid="field-commit"]').click();
    await page.locator('[data-testid="save-manifest"]').click();

    // Drawer から保存したので、原因は Drawer の中に出る。
    await expect(page.locator('[data-testid="manifest-drawer"] [data-testid="save-error"]')).toBeVisible();
    // 保存できていないので編集は残ったまま。破棄できる状態であること。
    await expect(page.locator('[data-testid="dirty"]')).toHaveAttribute('data-dirty', 'true');
    await page.screenshot({ path: 'tests/e2e/artifacts/05-save-rejected.png', fullPage: true });
  });

  test('主操作は OpenAPI の生成だけ', async ({ page }) => {
    // 起こし直しと編集は成果物ごとの行為なので行に置く。ページで押せるものを 1 つに絞る。
    const target = schemaNames[0];
    await page.locator(`[data-testid="manifest-row"][data-schema="${target}"] [data-testid="manifest-row-select"]`).check();

    await expect(page.locator('[data-testid="generate-openapi"]')).toBeEnabled();
    await expect(page.locator('[data-testid="draft-manifest"]')).toHaveCount(0);
  });

  test('マニフェストが無い行を含むと生成できない', async ({ page }) => {
    // compile は manifest_missing で止まる。押してから気づくのではなく押せない形にする。
    const withoutManifest = fixture.list_schemas
      .map((s) => s.schemaName)
      .find((name) => !fixture.manifests[name]);
    test.skip(!withoutManifest, 'マニフェストの無いスキーマがフィクスチャに無い');

    await page
      .locator(`[data-testid="manifest-row"][data-schema="${withoutManifest}"] [data-testid="manifest-row-select"]`)
      .check();
    await expect(page.locator('[data-testid="generate-blocked"]')).toBeVisible();
    await expect(page.locator('[data-testid="generate-openapi"]')).toBeDisabled();
  });
});
