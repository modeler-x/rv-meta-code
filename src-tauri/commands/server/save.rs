use tauri::AppHandle;

use crate::commands::server::build_service;
use crate::dto::server_dto::{SaveServerRequest, ServerSummaryDto};
use crate::errors::app_error::AppError;

#[tauri::command]
pub async fn save_server(
    app: AppHandle,
    request: SaveServerRequest,
) -> Result<ServerSummaryDto, AppError> {
    build_service(&app)?.save(request).await
}
