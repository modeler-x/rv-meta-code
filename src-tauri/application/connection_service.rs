use std::time::Duration;

use tauri::async_runtime;
use tokio_postgres::NoTls;

use crate::domain::connection::Connection;
use crate::dto::connection_dto::{
    ConnectionSummaryDto, SaveConnectionRequest, TestConnectionRequest, TestConnectionResponse,
};
use crate::errors::app_error::AppError;
use crate::infrastructure::crypto;
use crate::repositories::connection_repository::ConnectionRepository;

const CONNECT_TIMEOUT_SECS: u64 = 8;
const DEFAULT_PORT: u16 = 5432;

/// 接続リストの管理（作成・更新・削除・使用中切替）と接続テストを担う。
pub struct ConnectionService {
    repository: ConnectionRepository,
}

impl ConnectionService {
    pub fn new(repository: ConnectionRepository) -> Self {
        Self { repository }
    }

    pub fn list(&self) -> Result<Vec<ConnectionSummaryDto>, AppError> {
        let connections = self.repository.list()?;
        Ok(connections
            .iter()
            .map(ConnectionSummaryDto::from_domain)
            .collect())
    }

    pub fn save(&self, request: SaveConnectionRequest) -> Result<ConnectionSummaryDto, AppError> {
        if request.name.trim().is_empty() {
            return Err(AppError::validation("name is required"));
        }
        if request.host.trim().is_empty() {
            return Err(AppError::validation("host is required"));
        }

        let mut connections = self.repository.list()?;
        let saved = match request.id.as_deref().filter(|id| !id.is_empty()) {
            Some(id) => {
                let existing = connections
                    .iter_mut()
                    .find(|connection| connection.id == id)
                    .ok_or_else(|| AppError::not_found("connection not found"))?;
                existing.name = request.name.clone();
                existing.host = request.host.clone();
                existing.port = request.port.clone();
                existing.database = request.database.clone();
                existing.user = request.user.clone();
                if let Some(password) = request.password.as_ref() {
                    if !password.is_empty() {
                        existing.password = password.clone();
                    }
                }
                existing.clone()
            }
            None => {
                let is_first = connections.is_empty();
                let connection = Connection {
                    id: crypto::random_id(),
                    name: request.name.clone(),
                    host: request.host.clone(),
                    port: request.port.clone(),
                    database: request.database.clone(),
                    user: request.user.clone(),
                    password: request.password.clone().unwrap_or_default(),
                    is_current: is_first,
                };
                connections.push(connection.clone());
                connection
            }
        };
        self.repository.save_all(&connections)?;
        Ok(ConnectionSummaryDto::from_domain(&saved))
    }

    pub fn delete(&self, id: &str) -> Result<(), AppError> {
        let mut connections = self.repository.list()?;
        let was_current = connections
            .iter()
            .any(|connection| connection.id == id && connection.is_current);
        connections.retain(|connection| connection.id != id);
        // 使用中の接続を消したら、残った先頭を使用中に昇格させる。
        if was_current {
            if let Some(first) = connections.first_mut() {
                first.is_current = true;
            }
        }
        self.repository.save_all(&connections)
    }

    pub fn set_active(&self, id: &str) -> Result<(), AppError> {
        let mut connections = self.repository.list()?;
        if !connections.iter().any(|connection| connection.id == id) {
            return Err(AppError::not_found("connection not found"));
        }
        for connection in connections.iter_mut() {
            connection.is_current = connection.id == id;
        }
        self.repository.save_all(&connections)
    }

    pub async fn test(
        &self,
        request: TestConnectionRequest,
    ) -> Result<TestConnectionResponse, AppError> {
        let target = self.resolve_test_target(request)?;
        Ok(connect_postgres(target).await)
    }

    /// id 指定時は保存済みの値で未入力項目を補完する。
    fn resolve_test_target(
        &self,
        request: TestConnectionRequest,
    ) -> Result<PostgresTarget, AppError> {
        match request.id.as_deref().filter(|id| !id.is_empty()) {
            Some(id) => {
                let stored = self
                    .repository
                    .find(id)?
                    .ok_or_else(|| AppError::not_found("connection not found"))?;
                let password = request
                    .password
                    .filter(|value| !value.is_empty())
                    .unwrap_or(stored.password);
                Ok(PostgresTarget {
                    host: non_empty_or(request.host, stored.host),
                    port: non_empty_or(request.port, stored.port),
                    database: non_empty_or(request.database, stored.database),
                    user: non_empty_or(request.user, stored.user),
                    password,
                })
            }
            None => Ok(PostgresTarget {
                host: request.host,
                port: request.port,
                database: request.database,
                user: request.user,
                password: request.password.unwrap_or_default(),
            }),
        }
    }
}

struct PostgresTarget {
    host: String,
    port: String,
    database: String,
    user: String,
    password: String,
}

fn non_empty_or(primary: String, fallback: String) -> String {
    if primary.trim().is_empty() {
        fallback
    } else {
        primary
    }
}

async fn connect_postgres(target: PostgresTarget) -> TestConnectionResponse {
    let port = target.port.trim().parse::<u16>().unwrap_or(DEFAULT_PORT);

    // パスワードはログに出さない。接続先の解決結果のみ記録する。
    log::info!(
        "connection test start: host={} port={} database={} user={}",
        target.host,
        port,
        target.database,
        target.user
    );

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

    match config.connect(NoTls).await {
        Ok((client, connection)) => {
            // 接続の driver future はバックグラウンドで駆動する必要がある。
            async_runtime::spawn(async move {
                let _ = connection.await;
            });
            let server_version = client
                .query_one("SELECT version()", &[])
                .await
                .ok()
                .and_then(|row| row.try_get::<_, String>(0).ok());
            log::info!(
                "connection test succeeded: host={} port={} server_version={:?}",
                target.host,
                port,
                server_version
            );
            TestConnectionResponse {
                is_ok: true,
                message: "connection succeeded".to_string(),
                server_version,
            }
        }
        Err(error) => {
            log::error!(
                "connection test failed: host={} port={} database={} user={} error={:?}",
                target.host,
                port,
                target.database,
                target.user,
                error
            );
            TestConnectionResponse {
                is_ok: false,
                message: format!("{error}"),
                server_version: None,
            }
        }
    }
}
