use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::dto::operation_group_dto::OperationGroupDetailDto;
use crate::errors::app_error::AppError;

/// Operation Group 詳細（Operation 一覧＋components）を自然キー（schema + groupKey）で返す。
#[tauri::command]
pub async fn get_operation_group_detail(
    app: AppHandle,
    schema: String,
    group_key: String,
) -> Result<OperationGroupDetailDto, AppError> {
    if schema.trim().is_empty() || group_key.trim().is_empty() {
        return Err(AppError::validation("schema and groupKey are required"));
    }
    build_service(&app)?
        .get_operation_group_detail(&schema, &group_key)
        .await
}
