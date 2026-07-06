use tauri::AppHandle;

use crate::commands::connection::build_service;
use crate::errors::app_error::AppError;

#[tauri::command]
pub async fn delete_connection(app: AppHandle, id: String) -> Result<(), AppError> {
    build_service(&app)?.delete(&id)
}
