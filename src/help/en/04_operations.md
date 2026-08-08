# Operations

Edit the declaration of one function at a time. The profile tab changes what you edit.

## The postgrest tab

Every public function in the catalog is listed. You edit `operationId`,
`operationGroup`, `tags`, `security` and `description`. Functions without a declaration
are marked "undeclared" — not an error, just deny by default.

- **Declare** — creates a declaration. `security` defaults to requiring auth
- **Remove declaration** — the function stays, but leaves every document

## The bff tab

Only declared operations are listed. Here you edit the external URIs (publicRoutes).

- **Publish through the BFF** — adds one route. Arguments without a DEFAULT go to the body
- **Stop publishing** — drops publicRoutes, removing it from the bff document

## What the form fills in for you

- `parameters(in=path)` is derived from `{…}` in `path`; never write it twice
- bind rows come from the function's arguments; you never type an argument name
- `description` defaults to the function COMMENT — "use the function comment" pulls it in
- `security` is a choice between "requires auth" and "public"; no JSON to write
