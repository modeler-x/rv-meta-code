# publicRoutes and bind

One internal RPC can expand into several external routes. `rv_intake.receive()` serves
create / update / cancel, and the `const` in `bind` is the axis that separates them.

```json
{
  "operationId": "createDocument",
  "method": "POST",
  "path": "/{documentType}",
  "parameters": [{ "name": "documentType", "in": "path", "required": true, "schema": { "type": "string" } }],
  "bind": { "p_operation": { "const": "create" }, "p_payload": { "from": "body" } }
}
```

## What bind means

| form | where the value comes from | visible outside |
|---|---|---|
| `{"from": "body"}` | the request body | yes, it appears in requestBody |
| `{"from": "path"}` | a path parameter | yes, it is part of the URI |
| `{"const": "create"}` | fixed by the route | no — this is what separates routes |
| not bound | nowhere | blocks compile when the argument has no DEFAULT |

Keeping `const` out of the wire is the point. Exposing it would force callers to pass
`p_operation` themselves, which defeats splitting the routes.

## path and parameters

Every `{param}` in `path` must be declared in `parameters(in=path)`. This screen derives
them from `path`, so there is nothing to keep in sync by hand.
