use serde_json::Value;
use tokio_postgres::Row;

use crate::dto::compile_schema_response::CompileSchemaResponse;
use crate::dto::metadata_dto::{
    DocumentDto, EntityDetailDto, EntitySummaryDto, FieldDto, OperationDto, SchemaSummaryDto,
};
use crate::errors::app_error::AppError;
use crate::infrastructure::pg::{self, PgTarget};

/// 現在接続中DBの rv_meta メタデータを照会する。
/// 生成ロジックは DB(rv_meta) 側に置き、ここはクエリ実行とDTO変換のみを担う（薄いデータアクセス層）。
pub struct MetadataService {
    target: PgTarget,
}

fn db_err(error: tokio_postgres::Error) -> AppError {
    AppError::database(&format!("query failed: {error}"))
}

/// 除外スキーマのパターンを PostgreSQL の LIKE パターンへ変換する。
/// `*` を任意長ワイルドカードとし、LIKE 特殊文字（`%` `_` `\`）はリテラルとしてエスケープする。
/// 例: `_timescale*` → `\_timescale%`、`cron` → `cron`。
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

impl MetadataService {
    pub fn new(target: PgTarget) -> Self {
        Self { target }
    }

    /// DB全体のスキーマ一覧＋コメント＋テーブル数/ビュー数（pg_catalog から集計）。
    /// 接続設定の除外スキーマ（`*` をワイルドカードとするパターン）に一致するものは除く。
    pub async fn list_schemas(&self) -> Result<Vec<SchemaSummaryDto>, AppError> {
        let client = pg::connect(&self.target).await?;
        // 除外パターンを SQL の LIKE パターンへ変換する（`*`→`%`、`_`/`%` はリテラル扱い）。
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
            .await
            .map_err(db_err)?;

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

    /// OpenAPI ドキュメント一覧。updated_at は ISO8601(UTC) 文字列で返す。
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
            .await
            .map_err(db_err)?;

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

    /// エンティティ一覧（フィールド数/オペレーション数つき）。
    /// schema=None なら全ドキュメント横断で返す。
    pub async fn list_entities(
        &self,
        schema: Option<&str>,
    ) -> Result<Vec<EntitySummaryDto>, AppError> {
        let client = pg::connect(&self.target).await?;
        let rows = client
            .query(
                "SELECT e.id, e.table_schema, e.table_name, e.resource_name, e.description,
                        (SELECT count(*) FROM rv_meta.openapi_fields f     WHERE f.entity_id = e.id),
                        (SELECT count(*) FROM rv_meta.openapi_operations o WHERE o.entity_id = e.id)
                 FROM rv_meta.openapi_entities e
                 JOIN rv_meta.openapi_documents d ON d.id = e.document_id
                 WHERE $1::text IS NULL OR d.schema_name = $1
                 ORDER BY d.schema_name, e.resource_name",
                &[&schema],
            )
            .await
            .map_err(db_err)?;

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
            })
            .collect())
    }

    /// エンティティ詳細＝フィールド一覧＋オペレーション一覧＋$ref 解決用 components。
    pub async fn entity_detail(&self, entity_id: i32) -> Result<EntityDetailDto, AppError> {
        let client = pg::connect(&self.target).await?;

        // このエンティティが属するドキュメントのスキーマ名。
        // 共通レスポンス（$ref）のマージと components 取得に用いる。
        let schema: String = client
            .query_one(
                "SELECT d.schema_name
                 FROM rv_meta.openapi_entities e
                 JOIN rv_meta.openapi_documents d ON d.id = e.document_id
                 WHERE e.id = $1",
                &[&entity_id],
            )
            .await
            .map_err(db_err)?
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
            .await
            .map_err(db_err)?;

        // ドキュメント生成時と同じく共通レスポンス（$ref）を各オペレーションにマージして返す。
        // これによりオペレーション詳細でエラーレスポンスも参照できる。
        let operation_rows = client
            .query(
                "SELECT id, entity_id, operation, method, path, summary, description,
                        parameters, request_body,
                        rv_meta._get_openapi_common_responses($2) || responses,
                        required_fields
                 FROM rv_meta.openapi_operations
                 WHERE entity_id = $1
                 ORDER BY id",
                &[&entity_id, &schema],
            )
            .await
            .map_err(db_err)?;

        // $ref（responses/schemas/securitySchemes）解決のため components をそのまま渡す。
        let components: Value = client
            .query_one("SELECT rv_meta._get_openapi_components($1)", &[&schema])
            .await
            .map_err(db_err)?
            .get(0);

        Ok(EntityDetailDto {
            fields: field_rows.iter().map(field_from_row).collect(),
            operations: operation_rows.iter().map(operation_from_row).collect(),
            components,
        })
    }

    /// 単一オペレーションの内容。
    pub async fn get_operation(&self, operation_id: i32) -> Result<OperationDto, AppError> {
        let client = pg::connect(&self.target).await?;
        let row = client
            .query_opt(
                "SELECT id, entity_id, operation, method, path, summary, description,
                        parameters, request_body, responses, required_fields
                 FROM rv_meta.openapi_operations
                 WHERE id = $1",
                &[&operation_id],
            )
            .await
            .map_err(db_err)?
            .ok_or_else(|| AppError::not_found("operation not found"))?;

        Ok(operation_from_row(&row))
    }

    /// スキーマから OpenAPI メタデータを生成（rv_meta.compile を実行）。
    pub async fn compile(&self, schema: &str) -> Result<CompileSchemaResponse, AppError> {
        let client = pg::connect(&self.target).await?;

        client
            .query_one("SELECT rv_meta.compile($1)", &[&schema])
            .await
            .map_err(db_err)?;

        // 生成後のドキュメントIDとオペレーション総数を取得して返す。
        let summary = client
            .query_opt(
                "SELECT d.id::bigint,
                        (SELECT count(*)
                         FROM rv_meta.openapi_operations o
                         JOIN rv_meta.openapi_entities e ON e.id = o.entity_id
                         WHERE e.document_id = d.id)
                 FROM rv_meta.openapi_documents d
                 WHERE d.schema_name = $1",
                &[&schema],
            )
            .await
            .map_err(db_err)?;

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
        entity_id: row.get(1),
        operation: row.get(2),
        method: row.get(3),
        path: row.get(4),
        summary: row.get(5),
        description: row.get(6),
        parameters: row.get(7),
        request_body: row.get(8),
        responses: row.get(9),
        required_fields: row.get(10),
    }
}
