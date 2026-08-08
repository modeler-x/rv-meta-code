# Schemas

The schemas under the current connection. This page decides only **whether a schema is
managed** and **whether to generate OpenAPI**. It does not touch the declarations.

## Steps

1. Select rows. Multiple selection is supported.
2. "Generate" builds the OpenAPI document. Generation requires a manifest.
3. "Open" moves to that schema's manifest. It only navigates; it creates nothing.

## Labels

- **declared** — the schema has a manifest
- **not created** — no manifest, so neither operations nor documents can be built

How many declarations are filled in belongs to the manifest, so it is not shown here.
