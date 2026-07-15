use serde::Serialize;
use serde_json::Value;

use crate::domain::connection::Connection;

/// 現在接続中DBの表示用サマリ（ヘッダ表示）。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CurrentConnectionDto {
    pub name: String,
    pub database: String,
    pub host: String,
}

impl CurrentConnectionDto {
    pub fn from_domain(connection: &Connection) -> Self {
        Self {
            name: connection.name.clone(),
            database: connection.database.clone(),
            host: connection.host.clone(),
        }
    }
}

/// スキーマ一覧の1行（スキーマ名/コメント/テーブル数/ビュー数）。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaSummaryDto {
    pub schema_name: String,
    pub comment: Option<String>,
    pub table_count: i64,
    pub view_count: i64,
}

/// OpenAPI ドキュメント一覧の1行。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentDto {
    pub id: i32,
    pub schema_name: String,
    pub title: String,
    pub version: String,
    pub description: Option<String>,
    /// ISO8601(UTC) 文字列。相対時刻表示はフロントで整形する。
    pub updated_at: String,
}

/// OpenAPI ドキュメント詳細（参照画面用）。各値の定義元判別のため annotation を含める。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentDetailDto {
    pub id: i32,
    pub schema_name: String,
    pub title: String,
    pub version: String,
    pub description: Option<String>,
    pub generation_mode: String,
    pub updated_at: String,
    pub entity_operation_count: i64,
    pub function_operation_count: i64,
    pub operation_group_count: i64,
    pub component_count: i64,
    /// 割り当てられた servers（OpenAPI servers 配列）。
    pub servers: Value,
    /// Root security requirements 配列。
    pub root_security: Value,
    /// @openapi-document 宣言（title/version/description/generationMode の SoT）。未宣言なら null。
    pub annotation: Option<Value>,
}

/// エンティティ一覧の1行（フィールド数/オペレーション数を含む）。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EntitySummaryDto {
    pub id: i32,
    pub table_schema: String,
    pub table_name: String,
    pub resource_name: String,
    pub description: Option<String>,
    pub field_count: i64,
    pub operation_count: i64,
    /// 参照専用ポリシー（true なら list/get のみ生成される）。
    pub is_read_only: bool,
}

/// フィールド（openapi_fields）。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FieldDto {
    pub id: i32,
    pub column_name: String,
    pub ordinal_position: i32,
    pub json_schema: Value,
    pub required: bool,
    pub is_primary_key: bool,
    pub is_read_only: bool,
    pub description: Option<String>,
}

/// オペレーション（openapi_operations）。Entity Operation と Function Operation の共通DTO。
/// id は operationRowId（DB内部の整数ID）、operationId は OpenAPI 文字列ID。混同しない。
/// entity_id と operation_group_id は同時に設定しない（ownerKind で所有者を示す）。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationDto {
    pub id: i32,
    pub operation_id: String,
    /// "entity" | "operationGroup"
    pub owner_kind: String,
    pub entity_id: Option<i32>,
    pub operation_group_id: Option<i32>,
    pub operation: String,
    pub method: String,
    pub path: String,
    /// OpenAPI tags（Entity は resource_name 既定、Function は @openapi.tags）。
    pub tags: Value,
    /// DB に保存された Operation 固有 security。NULL は Root 継承、[] は認証不要。
    pub security: Option<Value>,
    pub summary: Option<String>,
    pub description: Option<String>,
    pub parameters: Value,
    pub request_body: Option<Value>,
    pub responses: Value,
    pub required_fields: Vec<String>,
    /// Root security を合成した表示・検証用の実効 security。
    pub effective_security: Value,
    /// "root" | "operation" | "public"
    pub security_source: String,
    /// Function Operation の内部RPC（openapi_function_bindings）。Entity Operation では NULL。
    pub function_schema: Option<String>,
    pub function_name: Option<String>,
    pub identity_arguments: Option<String>,
}

/// 1ドキュメント分の OpenAPI 仕様（schema 名 + 完全な OpenAPI JSON）。
/// servers[] には登録済みサーバが内包される。SDK generator の入力に用いる。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenApiSpecDto {
    pub schema_name: String,
    pub spec: Value,
}

/// テーブル(エンティティ)詳細＝フィールド一覧＋オペレーション一覧＋$ref 解決用 components。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EntityDetailDto {
    pub fields: Vec<FieldDto>,
    pub operations: Vec<OperationDto>,
    /// components オブジェクト（schemas / responses / securitySchemes）。UI が $ref 解決に使う。
    pub components: Value,
}
