use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct CompileSchemaResponse {
    pub schema_name: String,
    pub document_id: Option<i64>,
    pub operation_count: i64,
}
