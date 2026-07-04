# 実行手順

実行方法は 2 系統ある。用途に応じて選ぶ。

| 方法 | 用途 | Rust 要否 |
|---|---|---|
| A. ブラウザ（Vite） | UI・画面遷移・i18n の素早い確認 | 不要 |
| B. Tauri デスクトップ | 本番同等の実機確認（ウィンドウ/ネイティブ） | 必要 |

現状フロントエンドはモックデータで自己完結しているため、A だけで全画面・全機能を確認できる。

## A. ブラウザベース（推奨・最短）

```bash
cd rv-meta-code
pnpm install          # 初回のみ
pnpm dev
```

- 表示された `http://127.0.0.1:5173/` をブラウザで開く。
- ソース保存で即時反映（HMR）。
- 停止: 起動ターミナルで `Ctrl+C`（バックグラウンド起動時は `pkill -f "vite.js"`）。

### 確認ポイント

- 各画面: Welcome / Schemas / Documents / Entities / Entity 詳細 / Operation / Recent / Profile / Connections
- 言語切替: Profile（左下 Guest）→「言語」で English / 日本語。UI 全体が即切替
- 生成: Schemas →「生成」→ 実行 → 進捗バー＋ステップ。`legacy` スキーマで `EMPTY_SCHEMA` エラー再現
- 接続 CRUD: 左下「接続先」→ 追加 / 編集 / 削除 / 使用中切替
- オペレーション: Entities → テーブルを開く → update が **PATCH**

## B. Tauri デスクトップアプリ

Rust ツールチェーンが必要（[01_setup.md](./01_setup.md) 参照）。`cargo` を PATH に通してから実行する。

```bash
cd rv-meta-code
export PATH="$(brew --prefix rustup)/bin:$PATH"   # cargo を PATH へ
pnpm tauri dev
```

- 内部で Vite（`beforeDevCommand`）を起動し、ビルドした Rust バイナリがネイティブウィンドウを開く。
- 初回は Rust の増分ビルドに 20 秒〜数分かかる。以降は高速。
- 停止: 起動ターミナルで `Ctrl+C`。

### 「`cargo metadata ... No such file or directory`」エラー

`cargo` が PATH に無い。上の `export PATH=...` を実行してから `pnpm tauri dev` を実行する。

## 補足: ウィンドウ設定

`src-tauri/tauri.conf.json` の `app.windows` でサイズ（既定 1180×760）やタイトルを変更できる。
