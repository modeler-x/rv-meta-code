use tauri::AppHandle;

use crate::commands::connection::build_service;
use crate::dto::connection_dto::ConnectionSummaryDto;
use crate::errors::app_error::AppError;

#[tauri::command]
pub async fn list_connections(app: AppHandle) -> Result<Vec<ConnectionSummaryDto>, AppError> {
    build_service(&app)?.list()
}
