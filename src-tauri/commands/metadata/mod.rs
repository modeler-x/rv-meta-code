pub mod current_connection;
pub mod documents;
pub mod entities;
pub mod entity_detail;
pub mod openapi_specs;
pub mod operation;
pub mod operation_groups;
pub mod schemas;
pub mod set_read_only;
pub mod validate_openapi;

use tauri::{AppHandle, Manager};

use crate::application::metadata_service::MetadataService;
use crate::domain::connection::Connection;
use crate::errors::app_error::AppError;
use crate::infrastructure::connection_store::ConnectionStore;
use crate::infrastructure::pg::PgTarget;
use crate::repositories::connection_repository::ConnectionRepository;
use crate::repositories::metadata_repository::MetadataRepository;

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

/// 現在接続中DBへの PgTarget を組み立てる。接続未選択なら not_found。
fn current_pg_target(app: &AppHandle) -> Result<PgTarget, AppError> {
    let connection =
        current_connection(app)?.ok_or_else(|| AppError::not_found("no active connection"))?;
    Ok(PgTarget::from_connection(&connection))
}

/// メタデータ照会用サービスを、現在接続中DBに向けて組み立てる。
/// DB アクセスは MetadataRepository に限定し、Service はオーケストレーションのみを担う。
pub(crate) fn build_service(app: &AppHandle) -> Result<MetadataService, AppError> {
    Ok(MetadataService::new(MetadataRepository::new(current_pg_target(app)?)))
}
