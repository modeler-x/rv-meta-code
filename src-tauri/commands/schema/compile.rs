use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::dto::compile_schema_request::CompileSchemaRequest;
use crate::dto::compile_schema_response::CompileSchemaResponse;
use crate::errors::app_error::AppError;

/// スキーマから OpenAPI メタデータを生成する。
/// 実処理は DB(rv_meta) 側の `rv_meta.compile(schema)` を現在接続中DBで実行する。
#[tauri::command]
pub async fn compile_schema(
    app: AppHandle,
    request: CompileSchemaRequest,
) -> Result<CompileSchemaResponse, AppError> {
    let schema = request.schema_name.trim();
    if schema.is_empty() {
        return Err(AppError::validation("schema_name is required"));
    }
    build_service(&app)?.compile(schema).await
}
