# Diagnostic codes

The same set `rv_meta.diagnose_manifest(schema)` returns. No side effects.

## Blocks compile (error)

| code | meaning | fix |
|---|---|---|
| `function_not_found` | declared, but no such function | drop the declaration or create the function |
| `function_ambiguous` | the overload is not pinned down | include argument types in the key |
| `bind_missing_argument` | an argument without a DEFAULT is unbound | give it `body`, `path` or `const` |
| `bind_unknown_argument` | no argument by that name | use the database argument name |
| `path_parameters_mismatch` | `path` and `parameters` disagree | this screen keeps them in sync |
| `method_invalid` | not an HTTP method | pick GET / POST / PUT / PATCH / DELETE |
| `path_invalid` | does not start with `/` | write it relative to `basePath` |
| `operation_id_missing` | no `operationId` | declare one |
| `tags_missing` / `security_missing` | a required key is absent | put it in `defaults` or on the operation |
| `generation_mode_invalid` / `base_path_invalid` | invalid profile value | choose an allowed value |
| `manifest_missing` | no manifest stored | draft one from the catalog |

## Does not block

| code | severity | meaning |
|---|---|---|
| `function_not_declared` | info | a public function with no declaration — deny by default |

## Where the gate really is

These diagnostics are a preview. What actually stops the work is `_check_manifest`
inside the `mox init` transaction, which rolls the whole layer back on a mismatch.
