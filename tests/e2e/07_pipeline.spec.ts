import { test, expect } from '@playwright/test';
import { installTauriStub } from './stub';
import { gotoPage } from './nav';
import { fixture } from '../fixtures';

/**
 * 工程の連なり。1 ページ 1 成果物で、主操作は次を作ること 1 つ。
 * どのページにいるか、次に何ができるかが読み取れることを固定する。
 */
const STAGES = ['schema', 'manifest', 'documents', 'sdkList'] as const;

test.describe('パイプライン', () => {
  test.beforeEach(async ({ page }) => {
    await installTauriStub(page);
    await page.goto('/');
  });

  test('4 つの工程が同じ帯で示され、現在地が分かる', async ({ page }) => {
    for (const [index, stage] of STAGES.entries()) {
      await gotoPage(page, stage);
      const rail = page.locator('[data-testid="stage-rail"]');
      await expect(rail).toHaveAttribute('data-current', stage);
      await expect(rail.locator('[data-testid="stage"]')).toHaveCount(STAGES.length);

      // 通り過ぎた工程は done、これからの工程は todo。
      await expect(rail.locator(`[data-testid="stage"][data-stage="${stage}"]`)).toHaveAttribute('data-state', 'current');
      if (index > 0) {
        await expect(rail.locator(`[data-testid="stage"][data-stage="${STAGES[index - 1]}"]`)).toHaveAttribute('data-state', 'done');
      }
    }
  });

  test('SDK は生成するまで一覧が空で、次にすることを示す', async ({ page }) => {
    // 成果物が無い状態を空白で放置しない。
    await gotoPage(page, 'sdkList');
    await expect(page.locator('[data-testid="sdk-row"]')).toHaveCount(0);
    await expect(page.getByText(/ドキュメントを選んで/)).toBeVisible();
  });

  test('生成した SDK が一覧に残り、由来から作り直せる', async ({ page }) => {
    const document = fixture.documents[0];

    // ドキュメントの行から生成する。契約面はその行から引き継ぐ。
    await gotoPage(page, 'documents');
    await page
      .locator(`[data-testid="row-generate-sdk"][data-schema="${document.schemaName}"][data-profile="${document.profile}"]`)
      .click();
    await expect(page.locator('[data-testid="sdk-target"]')).toHaveAttribute('data-profile', document.profile);

    // 生成の実処理はスタブに無いので、記録の経路だけをブラウザ側で作る。
    await page.evaluate(
      ([schemaName, profile]) => {
        localStorage.setItem(
          'rvc.sdk.history',
          JSON.stringify([
            {
              packageName: `@robovill/${schemaName}-${profile}`,
              schemaName,
              profile,
              generatorId: 'openapi-generator-cli',
              outputDirectory: '/tmp/out',
              fileCount: 38,
              generatedAt: new Date().toISOString()
            }
          ])
        );
      },
      [document.schemaName, document.profile]
    );

    await page.reload();
    await gotoPage(page, 'sdkList');
    const row = page.locator(
      `[data-testid="sdk-row"][data-schema="${document.schemaName}"][data-profile="${document.profile}"]`
    );
    await expect(row).toBeVisible();
    // 由来（スキーマと契約面）が行に出る。名前だけでは別物と区別できない。
    await expect(row.locator('[data-testid="sdk-profile"]')).toHaveAttribute('data-profile', document.profile);

    await row.locator('[data-testid="regenerate-sdk"]').click();
    await expect(page.locator('[data-testid="sdk-target"]')).toHaveAttribute('data-schema', document.schemaName);
  });
});
