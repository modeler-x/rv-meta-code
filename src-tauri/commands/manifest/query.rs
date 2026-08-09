use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::dto::metadata_dto::{
    CatalogCrudDto, CatalogFunctionDto, ManifestCoverageDto, ManifestDiagnosticDto, ManifestDto,
    ManifestFieldDto, ManifestFunctionDto, ManifestOverviewDto,
};
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

/// 宣言を編集するための入力元。引数を返すので、UI が bind の行を人に書かせずに組み立てられる。
#[tauri::command]
pub async fn manifest_functions(
    app: AppHandle,
    schema_name: String,
) -> Result<Vec<ManifestFunctionDto>, AppError> {
    let schema = require_schema(&schema_name)?;
    build_service(&app)?.manifest_functions(schema).await
}

/// 宣言できる項目の定義。スキーマに依存しないので引数を取らない。
///
/// 画面はこれを描き、項目一覧を持たない。持つと DB が読むキーが増えたときに漏れる。
#[tauri::command]
pub async fn manifest_fields(app: AppHandle) -> Result<Vec<ManifestFieldDto>, AppError> {
    build_service(&app)?.manifest_fields().await
}

/// 一覧の集約。スキーマごとに問い合わせず 1 回で全件返す。
#[tauri::command]
pub async fn manifest_overview(app: AppHandle) -> Result<Vec<ManifestOverviewDto>, AppError> {
    build_service(&app)?.manifest_overview().await
}

/// スキーマを跨いだオペレーション一覧の材料。
#[tauri::command]
pub async fn all_manifest_functions(app: AppHandle) -> Result<Vec<CatalogFunctionDto>, AppError> {
    build_service(&app)?.all_manifest_functions().await
}

/// テーブルから自動生成された CRUD。編集できない行として一覧に出す。
#[tauri::command]
pub async fn catalog_crud(app: AppHandle) -> Result<Vec<CatalogCrudDto>, AppError> {
    build_service(&app)?.catalog_crud().await
}
