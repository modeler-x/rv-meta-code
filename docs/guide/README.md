# 開発ガイド

Rv Meta Code の環境構築・実行・テスト・ビルド/デプロイ手順をまとめる。

## 目次

1. [環境セットアップ](./01_setup.md) — Homebrew / rustup / Node / pnpm、依存インストール
2. [実行手順](./02_run.md) — ブラウザベースの確認 / Tauri デスクトップアプリの起動
3. [テスト](./03_test.md) — 型チェック / フロントエンド単体 / バックエンド / E2E
4. [ビルド・デプロイ](./04_build_deploy.md) — 本番ビルド / `.app`・`.dmg` 生成 / 配布

## クイックスタート
ツールチェーン（Rust）不要。Node / pnpm のみで UI を確認できる。

```bash
cd ~/git/modelerX/rv-meta-code
pnpm tauri dev
```

```bash
# (初回のみ) pnpm install
# (ブラウザ確認用) pnpm tauri dev
# http://127.0.0.1:5178/ をブラウザで開く
```

## 前提

- 参照元の設計原則は [../architecture/](../architecture/) を参照する。
- ツールチェーンはすべてユーザー空間（`~/.nvm`, `~/.cargo`, `~/.rustup`, Homebrew 配下）に隔離する。`sudo` は使用しない。
