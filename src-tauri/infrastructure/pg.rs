use std::time::Duration;

use tauri::async_runtime;
use tokio_postgres::{Client, NoTls};

use crate::domain::connection::Connection;
use crate::errors::app_error::AppError;

const CONNECT_TIMEOUT_SECS: u64 = 8;
const DEFAULT_PORT: u16 = 5432;

/// PostgreSQL への接続先。現在接続中の [`Connection`] から生成する。
pub struct PgTarget {
    pub host: String,
    pub port: String,
    pub database: String,
    pub user: String,
    pub password: String,
    /// スキーマ一覧から除外するスキーマ名（複数）。
    pub excluded_schemas: Vec<String>,
}

impl PgTarget {
    pub fn from_connection(connection: &Connection) -> Self {
        Self {
            host: connection.host.clone(),
            port: connection.port.clone(),
            database: connection.database.clone(),
            user: connection.user.clone(),
            password: connection.password.clone(),
            excluded_schemas: connection.excluded_schemas.clone(),
        }
    }
}

/// 接続先へ接続し、駆動 future をバックグラウンドに載せた [`Client`] を返す。
/// 生成ロジックは DB(rv_meta) 側にあるため、ここではクエリ実行のための接続確立のみを担う。
pub async fn connect(target: &PgTarget) -> Result<Client, AppError> {
    let port = target.port.trim().parse::<u16>().unwrap_or(DEFAULT_PORT);

    let mut config = tokio_postgres::Config::new();
    config
        .host(&target.host)
        .port(port)
        .user(&target.user)
        .dbname(&target.database)
        .connect_timeout(Duration::from_secs(CONNECT_TIMEOUT_SECS));
    if !target.password.is_empty() {
        config.password(&target.password);
    }

    let (client, connection) = config
        .connect(NoTls)
        .await
        .map_err(|error| AppError::database(&format!("database connection failed: {error}")))?;

    // 接続の driver future はバックグラウンドで駆動する必要がある。
    async_runtime::spawn(async move {
        let _ = connection.await;
    });

    Ok(client)
}
