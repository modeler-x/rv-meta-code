use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::dto::metadata_dto::EntitySummaryDto;
use crate::errors::app_error::AppError;

/// エンティティ一覧（フィールド数/オペレーション数つき）。
/// schema 指定時はそのスキーマのみ、未指定なら全ドキュメント横断。
#[tauri::command]
pub async fn list_entities(
    app: AppHandle,
    schema: Option<String>,
) -> Result<Vec<EntitySummaryDto>, AppError> {
    build_service(&app)?.list_entities(schema.as_deref()).await
}
