use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::dto::metadata_dto::DocumentDetailDto;
use crate::errors::app_error::AppError;

/// OpenAPI ドキュメント詳細（件数・割当Server・Root Security・定義元判別用 annotation）を返す。
#[tauri::command]
pub async fn get_document_detail(
    app: AppHandle,
    schema: String,
    profile: String,
) -> Result<DocumentDetailDto, AppError> {
    if schema.trim().is_empty() {
        return Err(AppError::validation("schema is required"));
    }
    // profile は必須。既定値を置くと、指定し忘れが黙って内部契約を拾う。
    if profile.trim().is_empty() {
        return Err(AppError::validation("profile is required"));
    }
    build_service(&app)?.document_detail(&schema, &profile).await
}
