#!/usr/bin/env bash
# dev DB から E2E フィクスチャを採る。手書きしないのは、実物と食い違うと
# 画面を通しても意味が無いため。DB の中身が変わったらこれを流し直す。
#   usage: tests/fixtures/capture.sh > tests/fixtures/dev.json
set -euo pipefail
cd "$(dirname "$0")/../../../rv"
mox psql --env dev -t -A -c "
WITH s AS (
  SELECT n.nspname AS schema_name,
         obj_description(n.oid, 'pg_namespace') AS comment,
         (SELECT count(*) FROM pg_class c WHERE c.relnamespace = n.oid AND c.relkind = 'r')::int AS table_count,
         (SELECT count(*) FROM pg_class c WHERE c.relnamespace = n.oid AND c.relkind = 'v')::int AS view_count
  FROM pg_namespace n
  WHERE n.nspname IN (SELECT schema_name FROM rv_meta.openapi_manifests)
)
SELECT jsonb_pretty(jsonb_build_object(
  'list_schemas', (SELECT jsonb_agg(jsonb_build_object(
      'schemaName', schema_name, 'comment', comment,
      'tableCount', table_count, 'viewCount', view_count) ORDER BY schema_name) FROM s),
  'manifests', (SELECT jsonb_object_agg(schema_name, manifest) FROM rv_meta.openapi_manifests),
  'coverage', (SELECT jsonb_object_agg(s.schema_name, COALESCE(c.rows, '[]'::jsonb)) FROM s
      LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('functionKey', function_key, 'state', state)) AS rows
                         FROM rv_meta.manifest_coverage(s.schema_name)) c ON true),
  'functions', (SELECT jsonb_object_agg(s.schema_name, COALESCE(f.rows, '[]'::jsonb)) FROM s
      LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object(
                           'functionKey', function_key, 'state', state,
                           'comment', comment_body, 'arguments', arguments)) AS rows
                         FROM rv_meta.manifest_functions(s.schema_name)) f ON true),
  'fields', (SELECT jsonb_agg(jsonb_build_object(
      'level', level, 'field', field, 'kind', kind, 'options', options,
      'isRequired', is_required, 'inherits', inherits,
      'derivedFrom', derived_from, 'note', note) ORDER BY level, field)
      FROM rv_meta.manifest_fields()),
  'profiles', (SELECT jsonb_object_agg(s.schema_name, COALESCE(pr.rows, '[]'::jsonb)) FROM s
      LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object(
                           'schemaName', s.schema_name, 'profile', profile,
                           'declared', declared, 'compiled', compiled,
                           'operations', operations, 'operationGroups', operation_groups,
                           'documentHash', document_hash) ORDER BY profile) AS rows
                         FROM rv_meta.openapi_profiles(s.schema_name)) pr ON true),
  'documents', (SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'schemaName', schema_name, 'profile', profile, 'title', title,
      'version', version, 'description', description,
      'updatedAt', to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
      ORDER BY schema_name, profile) FROM rv_meta.openapi_documents),
  'diagnostics', (SELECT jsonb_object_agg(s.schema_name, COALESCE(d.rows, '[]'::jsonb)) FROM s
      LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object(
                           'severity', severity, 'location', location, 'code', code,
                           'message', message, 'hint', hint)) AS rows
                         FROM rv_meta.diagnose_manifest(s.schema_name)) d ON true)))
"
