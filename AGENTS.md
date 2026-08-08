# AGENTS.md - rv-meta-code

## 作業の進め方

- 変更前に、何をするかを短く説明する。
- 変更は小さく分け、画面・状態・IPC・Rust 実装を混在させない。
- 不明点は推測せず、仮定として明記する。
- ユーザーの未コミット変更を上書きしない。
- **指示された範囲だけを直す。** 別リポジトリのビルドが壊れて追随が要るときは、
  追随であることを明示し、それ以上の改修へ広げない。
- **画面構成が決まる前にテストを書かない。** 構成が変われば書き直しになる。
  順序は 画面構成 → 合意 → 実装 → テスト。
- **シグネチャを変える前に呼び出し側を grep で列挙する。** 列挙せずに変えて、
  型エラーが出た箇所を順に直す進め方を禁止する。

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

### 層ごとの責務（同じ事実を 2 回確かめない）

| 層 | 置き場所 | 環境 | 確かめること |
|---|---|---|---|
| unit | `tests/unit` | node | 判断のすべて。ViewModel / Service の変換・既定値・状態遷移 |
| component | `tests/component` | jsdom | 部品の契約と、ページが何を並べるか |
| E2E | `tests/e2e` | Playwright | 画面をまたぐ往復（保存 → 一覧が変わる） |

- **同じ検証を複数の層に書かない。** 判断は unit、描き方は component、遷移は E2E。
  E2E で `path` を書き換えて `parameters` を数える類は unit の仕事。
- **開発中は `pnpm test:unit` だけを回す。** 全体は最後に 1 回。
  unit は node 環境で Svelte の transform を伴わないため数秒で終わる。
- `pnpm test`（全体）、`npx playwright test`、`svelte-check`、`cargo check` は
  区切りで 1 回。**Rust を触っていないターンで `cargo check` を回さない。**

### 書き方

- **セレクタは `data-testid`。** 表示文言・CSS クラス・要素の並び順に依存しない。
  文言はロケールと変更で動き、クラスは装飾で動く。
- **期待値はフィクスチャから導出する。** スキーマ名・関数名・件数をテストに書かない。
  対象は「名前」ではなく「性質」で選ぶ（例: BFF ルートを最も多く持つスキーマ）。
- **フィクスチャは手書きしない。** `tests/fixtures/capture.sh` で dev DB から採る。
  実物と食い違ったフィクスチャで通るテストは、画面を通しても意味がない。
- 共通コンポーネント（`ListRow` / `Field` / `Drawer` / `DiagnosticList`）の契約は
  `tests/component/SharedComponents.test.ts` で 1 度だけ確かめる。
  ページ側は「宣言配列どおりの項目が出るか」だけを見る。

### 画面の確認

- 実データを見るときは `pnpm tauri dev`。
- 画面と操作だけを見るときは `pnpm dev:stub`（DB もビルドも不要）。
- `pnpm dev` は Tauri IPC が無いので接続一覧が空になる。実データの確認には使わない。
- スタブ本体は `src/dev/stubIpc.ts` の 1 つだけ。E2E 側に応答を書き足さない
  （2 か所に置くと、片方だけ実物と食い違っても気づけない）。

## UI 部品化

- 一覧行は `ListRow`、入力欄は `Field` / `FieldGrid` を使う。
  ページごとに `input` と `label` を組み直さない。組み直すと data-* の付け方が
  ページごとにずれ、テストも画面の数だけ増える。
- 編集フォームは「何を並べるか」の宣言配列で持つ。描き方はページに書かない。
- 色は必ずテーマ変数（`--rvc-success` / `--rvc-warning` / `--rvc-danger`）を使う。
  16 進数の直書きは、同じ意味の色が場所ごとにずれる原因になる。
- 状態は色だけで示さない。severity のような区別は文字ラベルも併記する。
- 値（スキーマ名・関数キー・診断コード・JSON）は選択・コピーできるようにする
  （`.rvc-value`）。操作要素の文字は選択させない。

## DB 契約への追随

- rv_meta の公開関数は profile を必須で取る。**フロントで既定値を補わない。**
  補うと、指定し忘れが黙って内部契約（postgrest）を配る経路になる。
- ドキュメント・SDK・components は `(schema, profile)` で一意。
  片方だけを引数に取る関数を作らない。
