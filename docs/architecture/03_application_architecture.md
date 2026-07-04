# アプリケーションアーキテクチャ

Rv Meta Code は、データベースの定義から API や SDK などを自動生成し、メタデータの管理を行うためのデスクトップアプリケーションである。

## 1. 機能要件

主要な利用者は、バックエンドサービスおよびデータベースの開発者である。以下の画面と機能を提供する。

- Welcome Page
- Schema Clone
- Document List
- Entity List
- Recent History
- Entity Detail

データモデルの参照先は rv-meta のテーブル定義である。

## 2. アプリケーション層構成

本アプリケーションは、Tauri のプロセス分離モデルを基盤とした独自の MVC 風構成を採用する。

- Model / Controller: Rust (Tauri Core) が担い、状態管理・PL/pgSQL 呼び出し・ファイル制御を実施する
- View: Svelte 5 が担い、UI 描画と軽量なインタラクションを実装する

## 3. 接続トポロジー

セキュリティとパフォーマンスの観点から、データベースへの直接接続や認証情報の保持はバックエンド側に隠蔽する。

```text
[フロントエンド: Svelte 5]
       │
       │ 1. 「処理起動」ボタン押下 (tauri.invoke)
       │ 4. メタ生成結果（JSON）を受信して画面描画
       ▼
[バックエンド: Tauri Core (Rust)]
       │
       │ 2. 接続情報の秘匿管理・リクエストのバリデーション
       │ 3. データベース（PostgreSQL）へクエリ発行
       ▼
[データベース: PostgreSQL]
```

## 4. 技術スタック

- Homebrew / fnm / rustup による環境隔離
- Rust + Tauri Core
- Node.js + pnpm + Vite + Svelte 5
- Tailwind CSS + DaisyUI
- GitHub Actions + GitHub Releases
