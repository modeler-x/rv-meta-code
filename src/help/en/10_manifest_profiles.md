# profiles

A schema holds at most two contracts. The profile is the name of the contract.

| profile | what it is | path / method |
|---|---|---|
| `postgrest` | what PostgREST actually serves | `/rpc/{proname}` and `POST`, fixed by the transport |
| `bff` | what is published outwards | exactly the declared `publicRoutes` |

This is a technical split, not a business one. Distinguishing audiences (internal versus
partner) belongs to `security` and `tags`, not to a new profile.

## Keys

| key | default | meaning |
|---|---|---|
| `basePath` | schema name | first URL segment. `^[a-z][a-z0-9_-]*$` |
| `title` | inferred from the schema name | document title |
| `version` | built-in default | API version |
| `generationMode` | `entity_and_function` | `function_only` suppresses table CRUD |
| `operationIdStyle` | `prefixed` | `bare` keeps the declared `operationId` as is |
| `naming.stripPrefix.arg` | none | prefix stripped from argument names; bff usually strips `p_` |

## Leave stripPrefix.arg empty for postgrest

PostgREST takes the database argument names on the wire. Stripping a prefix here makes
the published OpenAPI disagree with the names a caller must actually send.
