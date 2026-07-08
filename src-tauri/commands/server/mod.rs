pub mod delete;
pub mod list;
pub mod save;
pub mod test;

use tauri::{AppHandle, Manager};

use crate::application::server_service::ServerService;
use crate::errors::app_error::AppError;
use crate::infrastructure::connection_store::ConnectionStore;
use crate::infrastructure::pg::PgTarget;
use crate::repositories::connection_repository::ConnectionRepository;

/// サーバー管理サービスを、現在接続中DBに向けて組み立てる。
/// openapi_servers は接続中DBのメタデータのため、接続が未選択なら not_found を返す。
pub(crate) fn build_service(app: &AppHandle) -> Result<ServerService, AppError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| AppError::io(&format!("app data dir unavailable: {error}")))?;
    let repository = ConnectionRepository::new(ConnectionStore::new(&dir));
    let connection = repository
        .current()?
        .ok_or_else(|| AppError::not_found("no active connection"))?;
    Ok(ServerService::new(PgTarget::from_connection(&connection)))
}
