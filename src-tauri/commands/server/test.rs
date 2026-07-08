use tauri::AppHandle;

use crate::commands::server::build_service;
use crate::dto::server_dto::{TestServerRequest, TestServerResponse};
use crate::errors::app_error::AppError;

#[tauri::command]
pub async fn test_server(
    app: AppHandle,
    request: TestServerRequest,
) -> Result<TestServerResponse, AppError> {
    build_service(&app)?.test(request).await
}
