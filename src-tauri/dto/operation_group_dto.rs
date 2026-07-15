use serde::Serialize;
use serde_json::Value;

use crate::dto::metadata_dto::OperationDto;

/// Operation Group 一覧の1行（Operation 件数つき）。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationGroupSummaryDto {
    pub id: i32,
    pub document_id: i32,
    /// 所属スキーマ名。横断一覧で表示元と詳細取得（schema + group_key）に用いる。
    pub schema_name: String,
    /// Document 内で安定した識別子（例 auth）。詳細取得の自然キー。
    pub group_key: String,
    /// 表示名（例 Auth）。
    pub display_name: String,
    pub description: Option<String>,
    pub operation_count: i64,
}

/// Operation Group 詳細＝Group メタ＋Operation 一覧（共通 OperationDto）＋$ref 解決用 components。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationGroupDetailDto {
    pub operation_group: OperationGroupSummaryDto,
    pub operations: Vec<OperationDto>,
    /// components オブジェクト（schemas / responses / securitySchemes）。UI が $ref 解決に使う。
    pub components: Value,
}
