# AGENTS.md - rv-meta-code

## 作業の進め方

- 変更前に、何をするかを短く説明する。
- 変更は小さく分け、画面・状態・IPC・Rust 実装を混在させない。
- 不明点は推測せず、仮定として明記する。
- ユーザーの未コミット変更を上書きしない。

## プロジェクト目的

Rv Meta Code は、PostgreSQL の DB 定義から OpenAPI / SDK / メタデータを生成・管理する Tauri デスクトップアプリケーションである。

## アーキテクチャ

- Frontend: Svelte 5 + TypeScript + Tailwind CSS + DaisyUI
- Backend: Rust + Tauri Core
- DB: PostgreSQL / rv-meta PL/pgSQL
- 依存方向は常に `Presentation -> Application -> Domain -> Infrastructure`
- View から Repository や `invoke()` を直接呼ばない。
- Repository 以外に DB / IPC アクセスを書かない。

## フロントエンド配置

- `src/app`: ルーター、レイアウト、Provider、Bootstrap
- `src/pages`: Page コンポーネント。UI 描画とイベント委譲のみ
- `src/modules`: 機能単位の ViewModel / Service / Repository / DTO / Type
- `src/shared`: 3 箇所以上で再利用する共通 UI、型、定数、i18n、Result
- `src/styles`: アプリ全体の CSS とテーマ変数

## バックエンド配置

- `src-tauri/commands`: Tauri Command。1 ファイル 1 Command
- `src-tauri/application`: アプリケーションサービス
- `src-tauri/domain`: ドメインモデルとルール
- `src-tauri/repositories`: DB アクセス
- `src-tauri/dto`: IPC 境界の DTO
- `src-tauri/errors`: エラー型

## 命名規則

- ディレクトリは小文字。
- Svelte コンポーネントは PascalCase。
- ViewModel は `XxxViewModel.ts`。
- Service は `XxxService.ts`。
- Repository は `XxxRepository.ts`。
- Interface は `I` 始まり。
- Rust ファイルと関数は snake_case。
- Boolean は `is`, `has`, `can` で始める。
- 関数は動詞で始める。
- 抽象名 `data`, `list`, `info`, `manager`, `helper`, `common`, `misc`, `utils` は避ける。

## 禁止事項

- `.env` を読まない。
- `rm -rf *` を実行しない。
- `git push --force` を実行しない。
- `chmod 777 /` を実行しない。
- `curl ... | bash` を実行しない。
- `DROP TABLE` / `DELETE` を実行しない。
- View に `invoke()`, `fetch()`, 業務ロジック、データ変換を書かない。
- 巨大な `constants.ts`, `utils.ts`, 何でも入るコンポーネントを作らない。

## UI 実装ルール

- macOS のシステム設定風 UI を基準にする。
- `font-family: system-ui` を基本にする。
- 画面全体は 2 カラム構成を基本にする。
- 色は薄いグレー背景と Apple Blue 系アクセントを基本にする。
- Tailwind CSS / DaisyUI を使い、インライン style の大量移植はしない。
- プロトタイプ HTML は見た目の参照元であり、その構造をそのままコピーしない。

## テスト

- Frontend: Vitest + Svelte Testing Library
- Backend: Cargo test
- E2E: Playwright
- UI 分割後は ViewModel と Service を優先して単体テストする。
