use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::dto::metadata_dto::OpenApiProfileDto;
use crate::errors::app_error::AppError;

/// どの契約面が宣言され、どれが生成済みかを返す。
///
///   declared=true,  compiled=false … compile を流せば直る
///   declared=false, compiled=true  … manifest から消したのに生成物が残っている
#[tauri::command]
pub async fn openapi_profiles(
    app: AppHandle,
    schema: String,
) -> Result<Vec<OpenApiProfileDto>, AppError> {
    if schema.trim().is_empty() {
        return Err(AppError::validation("schema is required"));
    }
    build_service(&app)?.openapi_profiles(&schema).await
}
