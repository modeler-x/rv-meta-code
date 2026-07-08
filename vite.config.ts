import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [svelte()],
  server: {
    host: '127.0.0.1',
    // Tauri の devUrl(5173) と一致させる。埋まっていたら黙って別ポートに
    // 逃げず即エラーにし、白画面（ポート不一致）を防ぐ。
    port: 5173,
    strictPort: true
  },
  resolve: {
    // Tauri SPA（SSRなし）。テストでの Svelte コンポーネント描画にクライアント
    // ビルドを解決させるため browser 条件を明示する。
    conditions: ['browser'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    include: ['tests/frontend/**/*.test.ts']
  }
});
