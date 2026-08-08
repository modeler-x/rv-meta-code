import { defineConfig, devices } from '@playwright/test';

// macOS では tauri-driver が使えない（Windows / Linux のみ）ので、実アプリを
// WebDriver で動かす経路は取らない。ブラウザで描画とクリックを確かめ、
// Tauri IPC の応答は src/dev/stubIpc.ts が dev DB 由来の実データで返す。
// スタブは開発（pnpm dev:stub）と共用で、実装を 2 つ持たない。
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'tests/e2e/report', open: 'never' }]],
  outputDir: 'tests/e2e/artifacts',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    // 失敗時だけ残す。通ったときに大量の成果物を積み上げない。
    trace: 'retain-on-failure',
    video: 'off'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev:stub',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
