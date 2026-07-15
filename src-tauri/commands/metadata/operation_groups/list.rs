use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::dto::operation_group_dto::OperationGroupSummaryDto;
use crate::errors::app_error::AppError;

/// Operation Group 一覧（Operation 件数つき）を返す。
/// schema 省略時は全スキーマ横断（Functions のトップレベル一覧用）。
#[tauri::command]
pub async fn list_operation_groups(
    app: AppHandle,
    schema: Option<String>,
) -> Result<Vec<OperationGroupSummaryDto>, AppError> {
    let schema = schema.filter(|s| !s.trim().is_empty());
    build_service(&app)?
        .list_operation_groups(schema.as_deref())
        .await
}
