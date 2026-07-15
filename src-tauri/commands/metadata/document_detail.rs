use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::dto::metadata_dto::DocumentDetailDto;
use crate::errors::app_error::AppError;

/// OpenAPI ドキュメント詳細（件数・割当Server・Root Security・定義元判別用 annotation）を返す。
#[tauri::command]
pub async fn get_document_detail(
    app: AppHandle,
    schema: String,
) -> Result<DocumentDetailDto, AppError> {
    if schema.trim().is_empty() {
        return Err(AppError::validation("schema is required"));
    }
    build_service(&app)?.document_detail(&schema).await
}
