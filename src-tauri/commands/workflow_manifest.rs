use crate::application::workflow_manifest_service::{self, WorkerComponentCandidate};
use crate::errors::app_error::AppError;

#[tauri::command]
pub async fn scan_worker_components(
    root: String,
) -> Result<Vec<WorkerComponentCandidate>, AppError> {
    workflow_manifest_service::scan_worker_components(&root)
}

#[tauri::command]
pub async fn save_workflow_manifest(
    path: String,
    content: String,
) -> Result<Option<String>, AppError> {
    workflow_manifest_service::save_manifest(&path, &content, true)
}

#[tauri::command]
pub async fn save_workflow_manifest_as(path: String, content: String) -> Result<(), AppError> {
    workflow_manifest_service::save_manifest(&path, &content, false).map(|_| ())
}
