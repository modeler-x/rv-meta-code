use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::dto::metadata_dto::RouteConflictDto;
use crate::errors::app_error::AppError;

/// Entity 自動 CRUD と @openapi 関数の method+path 衝突を列挙する（副作用なし）。
/// compile 失敗時に「どのルートが衝突しているか」「function_only で解決できるか」を提示する。
#[tauri::command]
pub async fn diagnose_route_conflicts(
    app: AppHandle,
    schema_name: String,
) -> Result<Vec<RouteConflictDto>, AppError> {
    let schema = schema_name.trim();
    if schema.is_empty() {
        return Err(AppError::validation("schema_name is required"));
    }
    build_service(&app)?.diagnose_route_conflicts(schema).await
}
