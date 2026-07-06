use tauri::AppHandle;

use crate::commands::connection::build_service;
use crate::dto::connection_dto::{ConnectionSummaryDto, SaveConnectionRequest};
use crate::errors::app_error::AppError;

#[tauri::command]
pub async fn save_connection(
    app: AppHandle,
    request: SaveConnectionRequest,
) -> Result<ConnectionSummaryDto, AppError> {
    build_service(&app)?.save(request)
}
