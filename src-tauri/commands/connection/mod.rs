pub mod list;
pub mod save;
pub mod delete;
pub mod set_active;
pub mod test;

use tauri::{AppHandle, Manager};

use crate::application::connection_service::ConnectionService;
use crate::errors::app_error::AppError;
use crate::infrastructure::connection_store::ConnectionStore;
use crate::repositories::connection_repository::ConnectionRepository;

/// アプリのデータディレクトリを基点に接続サービスを組み立てる。
fn build_service(app: &AppHandle) -> Result<ConnectionService, AppError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| AppError::io(&format!("app data dir unavailable: {error}")))?;
    let store = ConnectionStore::new(&dir);
    Ok(ConnectionService::new(ConnectionRepository::new(store)))
}
