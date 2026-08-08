import type { Page } from '@playwright/test';
import type { StubOptions } from '@/dev/stubIpc';

/**
 * スタブ本体はアプリ側（src/dev/stubIpc.ts）にあり、pnpm dev:stub が読み込む。
 * ここでやるのは失敗の注入だけで、応答の定義は持たない。
 * 2 か所に置くと、片方だけ実物と食い違っても気づけない。
 */
export async function installTauriStub(page: Page, options: StubOptions = {}): Promise<void> {
  await page.addInitScript((value) => {
    (window as unknown as { __RV_STUB_OPTIONS__: unknown }).__RV_STUB_OPTIONS__ = value;
  }, options);
}

/** 画面上の操作が IPC まで届いたかを見る。 */
export async function calls(page: Page): Promise<{ command: string; args: unknown }[]> {
  return page.evaluate(
    () => (window as unknown as { __RV_STUB_CALLS__: unknown }).__RV_STUB_CALLS__ as never
  );
}
