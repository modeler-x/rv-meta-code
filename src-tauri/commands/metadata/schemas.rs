use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::dto::metadata_dto::SchemaSummaryDto;
use crate::errors::app_error::AppError;

/// 現在接続中DBのスキーマ一覧（コメント/テーブル数/ビュー数）。
#[tauri::command]
pub async fn list_schemas(app: AppHandle) -> Result<Vec<SchemaSummaryDto>, AppError> {
    build_service(&app)?.list_schemas().await
}
