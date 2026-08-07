use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::dto::metadata_dto::{ManifestCoverageDto, ManifestDiagnosticDto, ManifestDto};
use crate::errors::app_error::AppError;

fn require_schema(schema_name: &str) -> Result<&str, AppError> {
    let schema = schema_name.trim();
    if schema.is_empty() {
        return Err(AppError::validation("schema_name is required"));
    }
    Ok(schema)
}

/// 公開関数と manifest の宣言の突き合わせ。
/// undeclared は既定拒否で非公開になっているだけでエラーではない。
#[tauri::command]
pub async fn manifest_coverage(
    app: AppHandle,
    schema_name: String,
) -> Result<Vec<ManifestCoverageDto>, AppError> {
    let schema = require_schema(&schema_name)?;
    build_service(&app)?.manifest_coverage(schema).await
}

/// 登録済み manifest の静的検証（副作用なし）。全件返る。
#[tauri::command]
pub async fn diagnose_manifest(
    app: AppHandle,
    schema_name: String,
) -> Result<Vec<ManifestDiagnosticDto>, AppError> {
    let schema = require_schema(&schema_name)?;
    build_service(&app)?.diagnose_manifest(schema).await
}

/// DB に入っている下書き。未登録なら manifest が null で返る。
#[tauri::command]
pub async fn get_manifest(app: AppHandle, schema_name: String) -> Result<ManifestDto, AppError> {
    let schema = require_schema(&schema_name)?;
    build_service(&app)?.get_manifest(schema).await
}
