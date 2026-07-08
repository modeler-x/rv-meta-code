use tauri::AppHandle;

use crate::commands::server::build_service;
use crate::dto::server_dto::ServerSummaryDto;
use crate::errors::app_error::AppError;

#[tauri::command]
pub async fn list_servers(app: AppHandle) -> Result<Vec<ServerSummaryDto>, AppError> {
    build_service(&app)?.list().await
}
