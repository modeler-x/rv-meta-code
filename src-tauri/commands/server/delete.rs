use tauri::AppHandle;

use crate::commands::server::build_service;
use crate::errors::app_error::AppError;

#[tauri::command]
pub async fn delete_server(app: AppHandle, id: i32) -> Result<(), AppError> {
    build_service(&app)?.delete(id).await
}
