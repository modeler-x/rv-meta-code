# テスト

3 レイヤーに分離する（[../architecture/09_testing_rules.md](../architecture/09_testing_rules.md)）。

| レイヤー | ツール | コマンド | 状態 |
|---|---|---|---|
| 型チェック | svelte-check | `pnpm check` | 稼働 |
| フロントエンド単体 | Vitest | `pnpm test` | 稼働 |
| バックエンド | Cargo test | `cargo test` | 準備中 |
| E2E | Playwright | `pnpm exec playwright test` | 未導入 |

## 1. 型チェック

```bash
pnpm check
```

- `svelte-check` が `tsconfig.json` を用いて `.svelte` / `.ts` を検査する。
- CI・コミット前の必須チェック。0 エラーを維持する。

## 2. フロントエンド単体（Vitest + Testing Library）

```bash
pnpm test          # 単発実行（vitest run）
pnpm exec vitest   # ウォッチ実行
```

- 対象: `tests/frontend/**/*.test.ts`
- 優先的に ViewModel / Service を検証する（`tests/frontend/SchemaService.test.ts` を参照）。
- 設定は `vite.config.ts` の `test`（環境 jsdom）。

## 3. バックエンド（Cargo test）

```bash
cd src-tauri
export PATH="$(brew --prefix rustup)/bin:$PATH"
cargo test
```

- クエリ生成・プロセス制御など Rust ロジックを検証する。
- 現状はスタブ中心。テストは `src-tauri/tests/` または各モジュールの `#[cfg(test)]` に追加する。
  （`tests/backend/` のサンプルは cargo パッケージ未配線のため、`src-tauri` 側への配置が必要。）

## 4. E2E（Playwright）

```bash
pnpm add -D @playwright/test    # 初回のみ導入
pnpm exec playwright install    # ブラウザ取得
pnpm exec playwright test       # tests/e2e/**/*.spec.ts
```

- ローカル Mac で一連のフローを最終確認する用途。
- 依存 `@playwright/test` は未導入。導入後に有効化する。

## 5. まとめ実行（コミット前の目安）

```bash
pnpm check && pnpm test
```
