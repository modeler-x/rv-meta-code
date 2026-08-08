# Manifest

One row per schema. Open a row for that schema's diagnostics and per-schema settings.

## Steps

1. Select a schema without a manifest and press "Draft from catalog".
   `draft_manifest()` reads `pg_proc`, builds a skeleton and merges it into what is
   already declared. Existing declarations are never rewritten — only added to.
2. Open the row and read the diagnostics. A single error stops generation.
3. "Open this" jumps to the operation editor for the function at fault.
4. Review profiles and defaults.

## Diagnostics

- **error** — blocks compile: a mismatch with `pg_proc`, a missing bind, and so on
- **warning** — generation succeeds, but it is worth a look
- **info** — e.g. a public function with no declaration. Deny by default, not a fault

Diagnostics do not stop at the first finding. One pass shows everything to fix.

## defaults

Shallow-merged into every operation; the operation wins on the same key. It exists so
`operationGroup` / `tags` / `security` are not repeated once per function.
