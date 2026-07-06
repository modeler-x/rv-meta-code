use tauri::AppHandle;

use crate::commands::connection::build_service;
use crate::dto::connection_dto::{TestConnectionRequest, TestConnectionResponse};
use crate::errors::app_error::AppError;

#[tauri::command]
pub async fn test_connection(
    app: AppHandle,
    request: TestConnectionRequest,
) -> Result<TestConnectionResponse, AppError> {
    build_service(&app)?.test(request).await
}
