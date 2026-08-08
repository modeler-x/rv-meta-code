import { test, expect } from '@playwright/test';
import { installTauriStub, calls } from './stub';
import { gotoPage, openManifestDrawer } from './nav';
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

    await openManifestDrawer(page, schema!);
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

    await page.locator('[data-testid="profile-field"][data-profile="bff"][data-field="basePath"]').fill('external');
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
    await page.locator('[data-testid="defaults-field"][data-field="operationGroup"]').fill('Changed');
    await page.locator('[data-testid="save-manifest"]').click();

    // Drawer から保存したので、原因は Drawer の中に出る。
    await expect(page.locator('[data-testid="manifest-drawer"] [data-testid="save-error"]')).toBeVisible();
    // 保存できていないので編集は残ったまま。破棄できる状態であること。
    await expect(page.locator('[data-testid="dirty"]')).toHaveAttribute('data-dirty', 'true');
    await page.screenshot({ path: 'tests/e2e/artifacts/05-save-rejected.png', fullPage: true });
  });

  test('骨子をまとめて起こすと宣言が増える', async ({ page }) => {
    const target = schemaNames.find((name) => (fixture.coverage[name] ?? []).some((c) => c.state === 'undeclared'));
    test.skip(!target, '未宣言の関数を持つスキーマがフィクスチャに無い');

    const before = Object.keys(fixture.manifests[target!].operations).length;
    await page.locator(`[data-testid="manifest-row"][data-schema="${target}"] [data-testid="manifest-row-select"]`).check();
    await page.locator('[data-testid="draft-manifest"]').click();

    await expect
      .poll(async () => {
        const saved = (await calls(page)).filter((c) => c.command === 'load_manifest').pop();
        const manifest = (saved?.args as { manifest?: { operations?: object } })?.manifest;
        return Object.keys(manifest?.operations ?? {}).length;
      })
      .toBeGreaterThan(before);
  });
});
