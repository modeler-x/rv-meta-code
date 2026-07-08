use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompileSchemaResponse {
    pub schema_name: String,
    pub document_id: Option<i64>,
    pub operation_count: i64,
}
