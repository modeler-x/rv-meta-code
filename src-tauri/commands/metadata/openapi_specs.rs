use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::dto::metadata_dto::OpenApiSpecDto;
use crate::errors::app_error::AppError;

/// 選択されたスキーマ（ドキュメント）ごとの OpenAPI 仕様を返す。
/// プレビュー/コピー用。servers[] には登録済みサーバが内包される。
#[tauri::command]
pub async fn get_openapi_specs(
    app: AppHandle,
    schemas: Vec<String>,
) -> Result<Vec<OpenApiSpecDto>, AppError> {
    build_service(&app)?.get_openapi_specs(&schemas).await
}
