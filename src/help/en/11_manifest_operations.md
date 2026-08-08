# operations

The key is `name(identity_arguments)` — argument types included, so an overload is
identified unambiguously.

```
"receive(p_payload jsonb, p_operation text)"
```

## Keys

| key | required | meaning |
|---|---|---|
| `operationId` | yes | the SDK method name, written without a prefix |
| `operationGroup` | no | the SDK service name; defaults to `basePath` |
| `tags` | yes | classification; defaults to `defaults.tags` |
| `security` | yes | array of security requirements; `[]` means public, stated explicitly |
| `description` | no | the function COMMENT is the source of truth |
| `responses` | no | inferred from the return type when absent |
| `publicRoutes` | no | only what is declared reaches bff (deny by default) |

## Functions with no declaration

They appear in no document. That is the deny-by-default design: a forgotten declaration
never turns into an exposed endpoint. Operational routines such as `compile()` are
correctly left undeclared.
