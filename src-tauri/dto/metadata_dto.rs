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

/// オペレーション（openapi_operations）。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationDto {
    pub id: i32,
    pub entity_id: i32,
    pub operation: String,
    pub method: String,
    pub path: String,
    pub summary: Option<String>,
    pub description: Option<String>,
    pub parameters: Value,
    pub request_body: Option<Value>,
    pub responses: Value,
    pub required_fields: Vec<String>,
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
