use serde_json::Value;
use tokio_postgres::Row;

use crate::dto::compile_schema_response::CompileSchemaResponse;
use std::collections::HashSet;

use crate::dto::metadata_dto::{
    ComponentSummaryDto, DocumentDetailDto, DocumentDto, EntityDetailDto, EntitySummaryDto, FieldDto,
    OpenApiSpecDto, OperationDto, SchemaSummaryDto,
};
use crate::dto::operation_group_dto::{OperationGroupDetailDto, OperationGroupSummaryDto};
use crate::errors::app_error::AppError;
use crate::infrastructure::pg::{self, PgTarget};

/// rv_meta メタデータの DB アクセスを一手に担う（Repository 以外に SQL を置かない）。
/// 生成ロジックは rv_meta 側にあり、ここはクエリ実行と Row→DTO 変換のみを行う。
pub struct MetadataRepository {
    target: PgTarget,
}

/// Entity Operation / Function Operation を共通 OperationDto として取り出す SELECT。
/// $1 = schema。追加の絞り込みパラメータは $2 以降で与える。
/// effective_security は Operation 固有 security（NULL は Root 継承）を Root security で補完した値。
const OPERATION_SELECT: &str = "
    SELECT o.id, o.operation_id,
           CASE WHEN o.entity_id IS NOT NULL THEN 'entity' ELSE 'operationGroup' END,
           o.entity_id, o.operation_group_id, o.operation, o.method, o.path,
           COALESCE(o.tags, CASE WHEN e.resource_name IS NOT NULL
                                 THEN jsonb_build_array(e.resource_name)
                                 ELSE '[]'::jsonb END),
           o.security, o.summary, o.description, o.parameters, o.request_body,
           rv_meta._get_openapi_common_responses($1) || o.responses,
           o.required_fields,
           COALESCE(o.security, rv_meta._get_openapi_security($1)),
           CASE WHEN o.security IS NULL THEN 'root'
                WHEN jsonb_array_length(o.security) = 0 THEN 'public'
                ELSE 'operation' END,
           fb.function_schema, fb.function_name, fb.identity_arguments
    FROM rv_meta.openapi_operations o
    LEFT JOIN rv_meta.openapi_entities e ON e.id = o.entity_id
    LEFT JOIN rv_meta.openapi_function_bindings fb ON fb.operation_id = o.id
";

/// 除外スキーマの glob を PostgreSQL の LIKE パターンへ変換する（`*`→`%`、`_`/`%`/`\` はエスケープ）。
fn glob_to_like(pattern: &str) -> String {
    let mut out = String::with_capacity(pattern.len() + 4);
    for ch in pattern.chars() {
        match ch {
            '*' => out.push('%'),
            '%' => out.push_str("\\%"),
            '_' => out.push_str("\\_"),
            '\\' => out.push_str("\\\\"),
            other => out.push(other),
        }
    }
    out
}

impl MetadataRepository {
    pub fn new(target: PgTarget) -> Self {
        Self { target }
    }

    pub async fn list_schemas(&self) -> Result<Vec<SchemaSummaryDto>, AppError> {
        let client = pg::connect(&self.target).await?;
        let exclude_patterns: Vec<String> = self
            .target
            .excluded_schemas
            .iter()
            .map(|pattern| pattern.trim())
            .filter(|pattern| !pattern.is_empty())
            .map(glob_to_like)
            .collect();
        let rows = client
            .query(
                "SELECT n.nspname,
                        obj_description(n.oid, 'pg_namespace'),
                        count(*) FILTER (WHERE c.relkind = 'r'),
                        count(*) FILTER (WHERE c.relkind IN ('v', 'm'))
                 FROM pg_namespace n
                 LEFT JOIN pg_class c ON c.relnamespace = n.oid
                 WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
                   AND n.nspname NOT LIKE 'pg_%'
                   AND NOT (n.nspname LIKE ANY($1::text[]))
                 GROUP BY n.nspname, n.oid
                 ORDER BY n.nspname",
                &[&exclude_patterns],
            )
            .await?;
        Ok(rows
            .iter()
            .map(|row| SchemaSummaryDto {
                schema_name: row.get(0),
                comment: row.get(1),
                table_count: row.get(2),
                view_count: row.get(3),
            })
            .collect())
    }

    pub async fn list_documents(&self) -> Result<Vec<DocumentDto>, AppError> {
        let client = pg::connect(&self.target).await?;
        let rows = client
            .query(
                "SELECT id, schema_name, title, version, description,
                        to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')
                 FROM rv_meta.openapi_documents
                 ORDER BY updated_at DESC, schema_name",
                &[],
            )
            .await?;
        Ok(rows
            .iter()
            .map(|row| DocumentDto {
                id: row.get(0),
                schema_name: row.get(1),
                title: row.get(2),
                version: row.get(3),
                description: row.get(4),
                updated_at: row.get(5),
            })
            .collect())
    }

    /// OpenAPI ドキュメント詳細（件数・割当Server・Root Security・定義元判別用 annotation つき）。
    pub async fn document_detail(&self, schema: &str) -> Result<DocumentDetailDto, AppError> {
        let client = pg::connect(&self.target).await?;
        let row = client
            .query_opt(
                "SELECT d.id, d.schema_name, d.title, d.version, d.description, d.generation_mode,
                        to_char(d.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"'),
                        (SELECT count(*) FROM rv_meta.openapi_operations o WHERE o.document_id = d.id AND o.entity_id IS NOT NULL),
                        (SELECT count(*) FROM rv_meta.openapi_operations o WHERE o.document_id = d.id AND o.operation_group_id IS NOT NULL),
                        (SELECT count(*) FROM rv_meta.openapi_operation_groups g WHERE g.document_id = d.id),
                        rv_meta._get_openapi_servers(d.schema_name),
                        rv_meta._get_openapi_security(d.schema_name),
                        rv_meta._get_openapi_components(d.schema_name),
                        d.annotation
                 FROM rv_meta.openapi_documents d
                 WHERE d.schema_name = $1",
                &[&schema],
            )
            .await?
            .ok_or_else(|| AppError::not_found("document not found"))?;

        let components: Value = row.get(12);
        let section_len = |name: &str| {
            components
                .get(name)
                .and_then(Value::as_object)
                .map(|m| m.len())
                .unwrap_or(0)
        };
        let component_count =
            (section_len("schemas") + section_len("responses") + section_len("securitySchemes")) as i64;

        Ok(DocumentDetailDto {
            id: row.get(0),
            schema_name: row.get(1),
            title: row.get(2),
            version: row.get(3),
            description: row.get(4),
            generation_mode: row.get(5),
            updated_at: row.get(6),
            entity_operation_count: row.get(7),
            function_operation_count: row.get(8),
            operation_group_count: row.get(9),
            component_count,
            servers: row.get(10),
            root_security: row.get(11),
            annotation: row.get(13),
        })
    }

    /// components（schemas / responses / securitySchemes）の一覧。
    /// 宣言（template/document override）を SQL で取り、最終出力(emitted)と generated を Rust で統合する。
    pub async fn list_components(&self, schema: &str) -> Result<Vec<ComponentSummaryDto>, AppError> {
        let client = pg::connect(&self.target).await?;

        // 宣言済み component（template + document override）。override を優先した有効値。
        let declared = client
            .query(
                "SELECT component_section,
                        component_name,
                        bool_or(document_id IS NOT NULL) AS has_override,
                        (array_agg(definition ORDER BY (document_id IS NOT NULL) DESC))[1] AS definition,
                        (array_agg(enabled ORDER BY (document_id IS NOT NULL) DESC))[1] AS enabled
                 FROM rv_meta.openapi_components
                 WHERE document_id IS NULL OR document_id = rv_meta._get_document_id($1)
                 GROUP BY component_section, component_name",
                &[&schema],
            )
            .await?;

        // 最終 OpenAPI の components（Entity Schema・参照ベース securityScheme 反映済み）。
        let emitted: Value = client
            .query_one("SELECT rv_meta._get_openapi_components($1)", &[&schema])
            .await?
            .get(0);

        let is_emitted = |section: &str, name: &str| {
            emitted
                .get(section)
                .and_then(|s| s.get(name))
                .is_some()
        };

        let mut out: Vec<ComponentSummaryDto> = Vec::new();
        let mut seen: HashSet<(String, String)> = HashSet::new();
        for row in &declared {
            let section: String = row.get(0);
            let name: String = row.get(1);
            let has_override: bool = row.get(2);
            seen.insert((section.clone(), name.clone()));
            out.push(ComponentSummaryDto {
                emitted: is_emitted(&section, &name),
                scope: if has_override { "document" } else { "template" }.to_string(),
                definition: row.get(3),
                enabled: row.get(4),
                section,
                name,
            });
        }

        // 宣言に無い emitted component（Entity Schema 等）は generated として補う。
        for section in ["schemas", "responses", "securitySchemes"] {
            if let Some(members) = emitted.get(section).and_then(Value::as_object) {
                for (name, definition) in members {
                    if !seen.contains(&(section.to_string(), name.clone())) {
                        out.push(ComponentSummaryDto {
                            section: section.to_string(),
                            name: name.clone(),
                            scope: "generated".to_string(),
                            enabled: true,
                            emitted: true,
                            definition: definition.clone(),
                        });
                    }
                }
            }
        }

        out.sort_by(|a, b| (a.section.as_str(), a.name.as_str()).cmp(&(b.section.as_str(), b.name.as_str())));
        Ok(out)
    }

    pub async fn list_entities(
        &self,
        schema: Option<&str>,
    ) -> Result<Vec<EntitySummaryDto>, AppError> {
        let client = pg::connect(&self.target).await?;
        let rows = client
            .query(
                "SELECT e.id, e.table_schema, e.table_name, e.resource_name, e.description,
                        (SELECT count(*) FROM rv_meta.openapi_fields f     WHERE f.entity_id = e.id),
                        (SELECT count(*) FROM rv_meta.openapi_operations o WHERE o.entity_id = e.id),
                        e.is_read_only
                 FROM rv_meta.openapi_entities e
                 JOIN rv_meta.openapi_documents d ON d.id = e.document_id
                 WHERE $1::text IS NULL OR d.schema_name = $1
                 ORDER BY d.schema_name, e.resource_name",
                &[&schema],
            )
            .await?;
        Ok(rows
            .iter()
            .map(|row| EntitySummaryDto {
                id: row.get(0),
                table_schema: row.get(1),
                table_name: row.get(2),
                resource_name: row.get(3),
                description: row.get(4),
                field_count: row.get(5),
                operation_count: row.get(6),
                is_read_only: row.get(7),
            })
            .collect())
    }

    pub async fn entity_detail(&self, entity_id: i32) -> Result<EntityDetailDto, AppError> {
        let client = pg::connect(&self.target).await?;
        let schema: String = client
            .query_one(
                "SELECT d.schema_name
                 FROM rv_meta.openapi_entities e
                 JOIN rv_meta.openapi_documents d ON d.id = e.document_id
                 WHERE e.id = $1",
                &[&entity_id],
            )
            .await?
            .get(0);

        let field_rows = client
            .query(
                "SELECT id, column_name, ordinal_position, json_schema,
                        required, is_primary_key, is_read_only, description
                 FROM rv_meta.openapi_fields
                 WHERE entity_id = $1
                 ORDER BY ordinal_position",
                &[&entity_id],
            )
            .await?;

        let operation_rows = client
            .query(
                &format!("{OPERATION_SELECT} WHERE o.entity_id = $2 ORDER BY o.id"),
                &[&schema, &entity_id],
            )
            .await?;

        let components: Value = client
            .query_one("SELECT rv_meta._get_openapi_components($1)", &[&schema])
            .await?
            .get(0);

        Ok(EntityDetailDto {
            fields: field_rows.iter().map(field_from_row).collect(),
            operations: operation_rows.iter().map(operation_from_row).collect(),
            components,
        })
    }

    pub async fn get_operation(&self, operation_row_id: i32) -> Result<OperationDto, AppError> {
        let client = pg::connect(&self.target).await?;
        let schema: String = client
            .query_opt(
                "SELECT d.schema_name
                 FROM rv_meta.openapi_operations o
                 JOIN rv_meta.openapi_documents d ON d.id = o.document_id
                 WHERE o.id = $1",
                &[&operation_row_id],
            )
            .await?
            .ok_or_else(|| AppError::not_found("operation not found"))?
            .get(0);

        let row = client
            .query_opt(
                &format!("{OPERATION_SELECT} WHERE o.id = $2"),
                &[&schema, &operation_row_id],
            )
            .await?
            .ok_or_else(|| AppError::not_found("operation not found"))?;
        Ok(operation_from_row(&row))
    }

    pub async fn get_openapi_specs(
        &self,
        schemas: &[String],
    ) -> Result<Vec<OpenApiSpecDto>, AppError> {
        let client = pg::connect(&self.target).await?;
        let mut specs = Vec::with_capacity(schemas.len());
        for schema in schemas {
            let row = client
                .query_opt("SELECT rv_meta._get_openapi_document($1)", &[&schema])
                .await?;
            if let Some(row) = row {
                let spec: Option<Value> = row.get(0);
                if let Some(spec) = spec {
                    specs.push(OpenApiSpecDto {
                        schema_name: schema.clone(),
                        spec,
                    });
                }
            }
        }
        Ok(specs)
    }

    pub async fn set_read_only(
        &self,
        schema: &str,
        table: &str,
        is_read_only: bool,
    ) -> Result<(), AppError> {
        let client = pg::connect(&self.target).await?;
        client
            .execute(
                "SELECT rv_meta.set_read_only($1, $2, $3)",
                &[&schema, &table, &is_read_only],
            )
            .await?;
        Ok(())
    }

    pub async fn compile(&self, schema: &str) -> Result<CompileSchemaResponse, AppError> {
        let client = pg::connect(&self.target).await?;
        client
            .query_one("SELECT rv_meta.compile($1)", &[&schema])
            .await?;

        // Entity/Function を横断した Operation 総数を document_id で数える。
        let summary = client
            .query_opt(
                "SELECT d.id::bigint,
                        (SELECT count(*) FROM rv_meta.openapi_operations o WHERE o.document_id = d.id)
                 FROM rv_meta.openapi_documents d
                 WHERE d.schema_name = $1",
                &[&schema],
            )
            .await?;

        let (document_id, operation_count) = match summary {
            Some(row) => (Some(row.get::<_, i64>(0)), row.get::<_, i64>(1)),
            None => (None, 0),
        };
        Ok(CompileSchemaResponse {
            schema_name: schema.to_string(),
            document_id,
            operation_count,
        })
    }

    /// スキーマ内の Operation Group 一覧（id / documentId / Operation 件数つき）。
    pub async fn list_operation_groups(
        &self,
        schema: &str,
    ) -> Result<Vec<OperationGroupSummaryDto>, AppError> {
        let client = pg::connect(&self.target).await?;
        let rows = client
            .query(
                "SELECT g.id, g.document_id, g.group_key, g.display_name, g.description,
                        (SELECT count(*) FROM rv_meta.openapi_operations o WHERE o.operation_group_id = g.id)
                 FROM rv_meta.openapi_operation_groups g
                 JOIN rv_meta.openapi_documents d ON d.id = g.document_id
                 WHERE d.schema_name = $1
                 ORDER BY g.group_key",
                &[&schema],
            )
            .await?;
        Ok(rows.iter().map(operation_group_summary_from_row).collect())
    }

    /// Operation Group 詳細＝Group メタ＋Operation 一覧＋$ref 解決用 components。
    /// 自然キー（schema + group_key）で取得する。
    pub async fn operation_group_detail(
        &self,
        schema: &str,
        group_key: &str,
    ) -> Result<OperationGroupDetailDto, AppError> {
        let client = pg::connect(&self.target).await?;
        let group = client
            .query_opt(
                "SELECT g.id, g.document_id, g.group_key, g.display_name, g.description,
                        (SELECT count(*) FROM rv_meta.openapi_operations o WHERE o.operation_group_id = g.id)
                 FROM rv_meta.openapi_operation_groups g
                 JOIN rv_meta.openapi_documents d ON d.id = g.document_id
                 WHERE d.schema_name = $1 AND g.group_key = $2",
                &[&schema, &group_key],
            )
            .await?
            .ok_or_else(|| AppError::not_found("operation group not found"))?;

        let group_id: i32 = group.get(0);
        let operation_rows = client
            .query(
                &format!("{OPERATION_SELECT} WHERE o.operation_group_id = $2 ORDER BY o.operation_id"),
                &[&schema, &group_id],
            )
            .await?;

        let components: Value = client
            .query_one("SELECT rv_meta._get_openapi_components($1)", &[&schema])
            .await?
            .get(0);

        Ok(OperationGroupDetailDto {
            operation_group: operation_group_summary_from_row(&group),
            operations: operation_rows.iter().map(operation_from_row).collect(),
            components,
        })
    }
}

fn field_from_row(row: &Row) -> FieldDto {
    FieldDto {
        id: row.get(0),
        column_name: row.get(1),
        ordinal_position: row.get(2),
        json_schema: row.get(3),
        required: row.get(4),
        is_primary_key: row.get(5),
        is_read_only: row.get(6),
        description: row.get(7),
    }
}

fn operation_from_row(row: &Row) -> OperationDto {
    OperationDto {
        id: row.get(0),
        operation_id: row.get(1),
        owner_kind: row.get(2),
        entity_id: row.get(3),
        operation_group_id: row.get(4),
        operation: row.get(5),
        method: row.get(6),
        path: row.get(7),
        tags: row.get(8),
        security: row.get(9),
        summary: row.get(10),
        description: row.get(11),
        parameters: row.get(12),
        request_body: row.get(13),
        responses: row.get(14),
        required_fields: row.get(15),
        effective_security: row.get(16),
        security_source: row.get(17),
        function_schema: row.get(18),
        function_name: row.get(19),
        identity_arguments: row.get(20),
    }
}

fn operation_group_summary_from_row(row: &Row) -> OperationGroupSummaryDto {
    OperationGroupSummaryDto {
        id: row.get(0),
        document_id: row.get(1),
        group_key: row.get(2),
        display_name: row.get(3),
        description: row.get(4),
        operation_count: row.get(5),
    }
}

#[cfg(test)]
mod tests {
    use super::glob_to_like;

    #[test]
    fn glob_to_like_maps_wildcard_and_escapes_like_specials() {
        assert_eq!(glob_to_like("_timescale*"), "\\_timescale%");
        assert_eq!(glob_to_like("cron"), "cron");
        assert_eq!(glob_to_like("a%b_c"), "a\\%b\\_c");
        assert_eq!(glob_to_like("x*y*"), "x%y%");
    }
}
