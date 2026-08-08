import { test, expect } from '@playwright/test';
import { installTauriStub, calls } from './stub';
import { gotoPage } from './nav';
import { fixture, schemaWithTwoProfiles } from '../fixtures';

/**
 * ドキュメント。行は (schema, profile)。
 *
 * profile は「同じ schema から見せる API 契約面」で、SDK は「その契約面から生成される
 * 言語別成果物」。契約面を選ばずに出力できてしまうと、内部契約が公開物として配られる。
 */
test.describe('ドキュメント', () => {
  test.beforeEach(async ({ page }) => {
    await installTauriStub(page);
    await page.goto('/');
    await gotoPage(page, 'documents');
  });

  test('1 スキーマが持つ契約面ごとに行が出る', async ({ page }) => {
    await expect(page.locator('[data-testid="document-row"]')).toHaveCount(fixture.documents.length);

    for (const document of fixture.documents) {
      const row = page.locator(
        `[data-testid="document-row"][data-schema="${document.schemaName}"][data-profile="${document.profile}"]`
      );
      await expect(row).toBeVisible();
      await expect(row.locator('[data-testid="document-profile"]')).toHaveAttribute(
        'data-profile',
        document.profile
      );
    }
    await page.screenshot({ path: 'tests/e2e/artifacts/10-documents.png', fullPage: true });
  });

  test('契約面を混ぜた選択では出力できない', async ({ page }) => {
    // postgrest と bff は別の契約。1 つの成果物へまとめると、どちらの形なのか読めない。
    const schema = schemaWithTwoProfiles();
    test.skip(!schema, '2 つの契約面を持つスキーマがフィクスチャに無い');

    for (const document of fixture.documents.filter((d) => d.schemaName === schema)) {
      await page
        .locator(
          `[data-testid="document-row"][data-schema="${schema}"][data-profile="${document.profile}"] [data-testid="document-row-select"]`
        )
        .check();
    }

    await expect(page.locator('[data-testid="mixed-profile"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-spec"]')).toBeDisabled();
  });

  test('契約面を揃えれば、その profile で取得する', async ({ page }) => {
    const document = fixture.documents[0];
    await page
      .locator(
        `[data-testid="document-row"][data-schema="${document.schemaName}"][data-profile="${document.profile}"] [data-testid="document-row-select"]`
      )
      .check();
    await page.locator('[data-testid="export-spec"]').click();

    // profile が IPC まで届く。届かなければサーバー側が既定で内部契約を返してしまう。
    await expect
      .poll(async () => {
        const call = (await calls(page)).filter((c) => c.command === 'get_openapi_specs').pop();
        return (call?.args as { profile?: string })?.profile;
      })
      .toBe(document.profile);
  });

  test('行から次の成果物（SDK）へ進める', async ({ page }) => {
    // 成果物から次の成果物を作る。契約面はその行から引き継ぐ。
    const document = fixture.documents[0];
    await page
      .locator(
        `[data-testid="row-generate-sdk"][data-schema="${document.schemaName}"][data-profile="${document.profile}"]`
      )
      .click();

    // 由来（スキーマと契約面）が SDK の画面に出る。
    const target = page.locator('[data-testid="sdk-target"]');
    await expect(target).toHaveAttribute('data-schema', document.schemaName);
    await expect(target).toHaveAttribute('data-profile', document.profile);
  });
});
