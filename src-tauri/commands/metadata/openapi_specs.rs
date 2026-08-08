use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::dto::metadata_dto::OpenApiSpecDto;
use crate::errors::app_error::AppError;

/// 選択されたスキーマの、指定した契約面の OpenAPI 仕様を返す。
/// プレビュー/コピー用。servers[] には登録済みサーバが内包される。
///
/// profile は必須。postgrest（PostgREST が実際に受ける形）と bff（外部へ公開する形）は
/// 別物で、既定値を置くと指定し忘れが黙って内部契約を配ることになる。
#[tauri::command]
pub async fn get_openapi_specs(
    app: AppHandle,
    schemas: Vec<String>,
    profile: String,
) -> Result<Vec<OpenApiSpecDto>, AppError> {
    if profile.trim().is_empty() {
        return Err(AppError::validation("profile is required"));
    }
    build_service(&app)?.get_openapi_specs(&schemas, &profile).await
}
