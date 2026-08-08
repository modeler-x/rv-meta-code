# profiles

1 つのスキーマが最大 2 つの契約を持ちます。profile はその契約の名前です。

| profile | 何を表すか | path / method |
|---|---|---|
| `postgrest` | PostgREST が実際に受ける形 | `/rpc/{proname}` と `POST` 固定。宣言では変えられません |
| `bff` | 外部へ公開する形 | 宣言した `publicRoutes` がそのまま使われます |

技術的な二分であって業務区分ではありません。公開先ごとの区別（社内 / パートナー）は
profile ではなく `security` と `tags` で表します。

## 項目

| キー | 既定 | 説明 |
|---|---|---|
| `basePath` | スキーマ名 | 公開 URL の第 1 セグメント。`^[a-z][a-z0-9_-]*$` |
| `title` | スキーマ名から推論 | ドキュメントのタイトル |
| `version` | 既定値 | API バージョン |
| `generationMode` | `entity_and_function` | `function_only` にするとテーブル CRUD を出しません |
| `operationIdStyle` | `prefixed` | `bare` は宣言した `operationId` をそのまま使います |
| `naming.stripPrefix.arg` | なし | 引数名から落とす接頭辞。bff では `p_` を落とすのが通例です |

## postgrest では stripPrefix.arg を空にする

PostgREST は DB 上の引数名をそのまま wire で受けます。ここで接頭辞を落とすと、
OpenAPI に出る名前と実際に送るべき名前が食い違います。
