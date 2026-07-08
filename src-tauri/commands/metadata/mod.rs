pub mod current_connection;
pub mod documents;
pub mod entities;
pub mod entity_detail;
pub mod operation;
pub mod schemas;

use tauri::{AppHandle, Manager};

use crate::application::metadata_service::MetadataService;
use crate::domain::connection::Connection;
use crate::errors::app_error::AppError;
use crate::infrastructure::connection_store::ConnectionStore;
use crate::infrastructure::pg::PgTarget;
use crate::repositories::connection_repository::ConnectionRepository;

/// アプリのデータディレクトリから接続リポジトリを組み立てる。
fn build_repository(app: &AppHandle) -> Result<ConnectionRepository, AppError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| AppError::io(&format!("app data dir unavailable: {error}")))?;
    Ok(ConnectionRepository::new(ConnectionStore::new(&dir)))
}

/// 現在接続中（is_current）の接続を返す。無ければ None。
pub(crate) fn current_connection(app: &AppHandle) -> Result<Option<Connection>, AppError> {
    build_repository(app)?.current()
}

/// メタデータ照会用サービスを、現在接続中DBに向けて組み立てる。
/// 接続が選択されていない場合は not_found を返す。
pub(crate) fn build_service(app: &AppHandle) -> Result<MetadataService, AppError> {
    let connection =
        current_connection(app)?.ok_or_else(|| AppError::not_found("no active connection"))?;
    Ok(MetadataService::new(PgTarget::from_connection(&connection)))
}
