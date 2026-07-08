use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::dto::metadata_dto::OperationDto;
use crate::errors::app_error::AppError;

/// 単一オペレーションの内容。
#[tauri::command]
pub async fn get_operation(app: AppHandle, operation_id: i32) -> Result<OperationDto, AppError> {
    build_service(&app)?.get_operation(operation_id).await
}
