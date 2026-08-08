# rv-meta-code のヘルプ

このアプリは、PostgreSQL のカタログと `rv_meta` の宣言（manifest）を突き合わせ、
OpenAPI と SDK を生成するための編集画面です。

## 操作手順

- [接続](01_connections.md) — どのサーバーを見るかを決める
- [スキーマ](02_schemas.md) — 管理対象を選び、OpenAPI を生成する
- [マニフェスト](03_manifest.md) — 診断とスキーマ単位の設定
- [オペレーション](04_operations.md) — 関数ごとの宣言を編集する

## manifest 仕様

- [profiles](10_manifest_profiles.md) — postgrest と bff の違い
- [operations](11_manifest_operations.md) — 関数 1 本の宣言
- [publicRoutes と bind](12_manifest_public_routes.md) — 外部 URI と引数の対応
- [診断コード](13_diagnostics.md) — 何が止まり、何が止まらないか

## この 3 つの関係

宣言の原本はリポジトリの `manifest.sql` です。アプリが保存するのは DB 側の下書きで、
`mox init` のたびにファイルの内容で置き換わります。書き出していない編集は消えます。

ゲートの本体もこのアプリにはありません。`mox init` のトランザクション内で
`_check_manifest` が走り、`pg_proc` と宣言が食い違えば層ごとロールバックします。
アプリの診断はそれを事前に、副作用なしで見るためのものです。
