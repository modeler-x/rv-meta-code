use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::errors::app_error::AppError;

/// entity の参照専用ポリシーを切り替える。
/// 実処理は DB(rv_meta) 側の `rv_meta.set_read_only(schema, table, is_read_only)` を実行する。
#[tauri::command]
pub async fn set_read_only(
    app: AppHandle,
    schema: String,
    table: String,
    is_read_only: bool,
) -> Result<(), AppError> {
    let schema = schema.trim();
    let table = table.trim();
    if schema.is_empty() || table.is_empty() {
        return Err(AppError::validation("schema and table are required"));
    }
    build_service(&app)?
        .set_read_only(schema, table, is_read_only)
        .await
}
