# publicRoutes と bind

1 つの内部 RPC が複数の外部ルートへ展開されます。`rv_intake.receive()` が
登録 / 変更 / 取消 の 3 ルートを兼ねるのがその例で、`bind` の `const` が
ルートを分ける軸になります。

```json
{
  "operationId": "createDocument",
  "method": "POST",
  "path": "/{documentType}",
  "parameters": [{ "name": "documentType", "in": "path", "required": true, "schema": { "type": "string" } }],
  "bind": { "p_operation": { "const": "create" }, "p_payload": { "from": "body" } }
}
```

## bind の意味

| 書き方 | どこから来るか | 外部から見えるか |
|---|---|---|
| `{"from": "body"}` | リクエスト本文 | 見えます。requestBody に出ます |
| `{"from": "path"}` | path parameter | 見えます。URI の一部です |
| `{"const": "create"}` | ルートが固定します | 見えません。ルートを分ける軸です |
| 未 bind | どこからも来ません | DEFAULT が無い引数だと compile が止まります |

`const` を外部に出さないのが要点です。出してしまうと、利用者に `p_operation` を
渡させることになり、ルートを分けた意味がなくなります。

## path と parameters

`path` に書いた `{param}` は、`parameters(in=path)` にすべて宣言されている必要があります。
この画面では `path` から自動で作るので、手で合わせる必要はありません。
