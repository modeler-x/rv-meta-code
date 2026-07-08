use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::dto::metadata_dto::EntityDetailDto;
use crate::errors::app_error::AppError;

/// エンティティ詳細（フィールド一覧＋オペレーション一覧）。
#[tauri::command]
pub async fn get_entity_detail(app: AppHandle, entity_id: i32) -> Result<EntityDetailDto, AppError> {
    build_service(&app)?.entity_detail(entity_id).await
}
