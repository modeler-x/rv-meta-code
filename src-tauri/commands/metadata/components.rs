use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::dto::metadata_dto::ComponentSummaryDto;
use crate::errors::app_error::AppError;

/// スキーマの OpenAPI components 一覧（scope / enabled / emitted / 有効定義）を返す。
#[tauri::command]
pub async fn list_components(
    app: AppHandle,
    schema: String,
) -> Result<Vec<ComponentSummaryDto>, AppError> {
    if schema.trim().is_empty() {
        return Err(AppError::validation("schema is required"));
    }
    build_service(&app)?.list_components(&schema).await
}
