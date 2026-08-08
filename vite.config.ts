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
    // 2 つに分ける。判断（ViewModel / Service）は DOM を要らないので node で走らせる。
    // Svelte の transform と jsdom の起動が要るのは component だけで、
    // 開発中に回すのは unit だけで足りる（実測 56s → 数秒）。
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts']
        }
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['tests/component/**/*.test.ts']
        }
      }
    ]
  }
});
