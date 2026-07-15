use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::dto::operation_group_dto::OperationGroupSummaryDto;
use crate::errors::app_error::AppError;

/// スキーマ内の Operation Group 一覧（Operation 件数つき）を返す。
#[tauri::command]
pub async fn list_operation_groups(
    app: AppHandle,
    schema: String,
) -> Result<Vec<OperationGroupSummaryDto>, AppError> {
    if schema.trim().is_empty() {
        return Err(AppError::validation("schema is required"));
    }
    build_service(&app)?.list_operation_groups(&schema).await
}
