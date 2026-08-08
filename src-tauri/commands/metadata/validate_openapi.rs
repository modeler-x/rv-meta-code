use tauri::AppHandle;

use crate::application::openapi_validator::{DefaultOpenApiValidator, OpenApiValidator};
use crate::commands::metadata::build_service;
use crate::dto::validation_dto::ValidationReport;
use crate::errors::app_error::AppError;

/// 指定スキーマの生成済み OpenAPI Document を取得し、SDK 生成前検証を行う。
/// errors が1件以上なら is_valid=false（呼び出し側は生成を開始しない）。
#[tauri::command]
pub async fn validate_openapi(
    app: AppHandle,
    schema: String,
    profile: String,
) -> Result<ValidationReport, AppError> {
    if schema.trim().is_empty() {
        return Err(AppError::validation("schema is required"));
    }
    // profile は必須。既定値を置くと、指定し忘れが黙って内部契約を拾う。
    if profile.trim().is_empty() {
        return Err(AppError::validation("profile is required"));
    }
    let specs = build_service(&app)?
        .get_openapi_specs(std::slice::from_ref(&schema), &profile)
        .await?;
    let spec = specs
        .into_iter()
        .next()
        .ok_or_else(|| AppError::not_found("openapi document not found"))?;
    Ok(DefaultOpenApiValidator::new().validate(&spec.spec))
}
