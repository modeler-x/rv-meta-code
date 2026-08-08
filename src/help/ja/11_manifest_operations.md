# operations

キーは `関数名(identity_arguments)` です。overload を一意に指すため、引数の型まで含めます。

```
"receive(p_payload jsonb, p_operation text)"
```

## 項目

| キー | 必須 | 説明 |
|---|---|---|
| `operationId` | はい | SDK のメソッド名の元。prefix なしで書きます |
| `operationGroup` | いいえ | SDK の Service 名。未指定は `basePath` |
| `tags` | はい | 分類。未指定は `defaults.tags` |
| `security` | はい | Security Requirement の配列。公開なら `[]` を明示します |
| `description` | いいえ | 説明。原本は関数の COMMENT です |
| `responses` | いいえ | 未指定なら戻り値の型から推論します |
| `publicRoutes` | いいえ | 宣言したものだけが bff に出ます（既定拒否） |

## 宣言が無い関数

どのドキュメントにも出ません。これは既定拒否の設計で、書き忘れが公開に化けないように
しています。運用操作（`compile()` など）は宣言しないのが正しい状態です。
