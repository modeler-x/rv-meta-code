# rv-meta-code help

This app edits the declarations (the manifest) that `rv_meta` compares against the
PostgreSQL catalog to generate OpenAPI documents and SDKs.

## How to work

- [Connections](01_connections.md) — decide which server you are looking at
- [Schemas](02_schemas.md) — pick what to manage and generate OpenAPI
- [Manifest](03_manifest.md) — diagnostics and per-schema settings
- [Operations](04_operations.md) — edit the declaration of each function

## Manifest reference

- [profiles](10_manifest_profiles.md) — postgrest versus bff
- [operations](11_manifest_operations.md) — the declaration of one function
- [publicRoutes and bind](12_manifest_public_routes.md) — external URIs and arguments
- [Diagnostics](13_diagnostics.md) — what blocks compile and what does not

## How the three relate

The source of truth is `manifest.sql` in the repository. What this app stores is the
draft in the database, and `mox init` replaces it with the file's content every time.
Edits you never write out are lost.

The gate itself is not in this app either. `_check_manifest` runs inside the `mox init`
transaction and rolls the whole layer back when `pg_proc` and the declaration disagree.
The diagnostics here run the same checks up front, without side effects.
