use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::dto::metadata_dto::DocumentDto;
use crate::errors::app_error::AppError;

/// OpenAPI ドキュメント一覧。
#[tauri::command]
pub async fn list_documents(app: AppHandle) -> Result<Vec<DocumentDto>, AppError> {
    build_service(&app)?.list_documents().await
}
