# 診断コード

`rv_meta.diagnose_manifest(schema)` が返すものと同じです。副作用はありません。

## compile を止めるもの（error）

| code | 意味 | 直し方 |
|---|---|---|
| `function_not_found` | 宣言はあるが関数が無い | 宣言を消すか、関数を作る |
| `function_ambiguous` | overload を一意に指せていない | キーに引数の型まで書く |
| `bind_missing_argument` | DEFAULT の無い引数が bind されていない | `body` / `path` / `const` のいずれかを与える |
| `bind_unknown_argument` | その名前の引数が無い | 引数名は DB 上の名前で書く |
| `path_parameters_mismatch` | `path` の `{…}` と `parameters` が食い違う | この画面では自動で揃います |
| `method_invalid` | HTTP method ではない | GET / POST / PUT / PATCH / DELETE から選ぶ |
| `path_invalid` | `/` で始まっていない | `basePath` からの相対で書く |
| `operation_id_missing` | `operationId` が無い | 宣言する |
| `tags_missing` / `security_missing` | 必須項目が無い | `defaults` に置くか operation に書く |
| `generation_mode_invalid` / `base_path_invalid` | profile の値が不正 | 取りうる値から選ぶ |
| `manifest_missing` | manifest が未登録 | カタログから起こす |

## 止めないもの

| code | severity | 意味 |
|---|---|---|
| `function_not_declared` | info | 公開関数だが宣言が無い。既定拒否で非公開になっているだけ |

## ゲートの本体

このアプリの診断は事前確認です。実際に止めるのは `mox init` のトランザクション内で
走る `_check_manifest` で、食い違えば層ごとロールバックします。
