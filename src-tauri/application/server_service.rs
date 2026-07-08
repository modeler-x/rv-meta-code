use std::time::{Duration, Instant};

use serde_json::Value;
use tokio_postgres::Row;

use crate::domain::server::Server;
use crate::dto::server_dto::{SaveServerRequest, ServerSummaryDto, TestServerRequest, TestServerResponse};
use crate::errors::app_error::AppError;
use crate::infrastructure::pg::{self, PgTarget};

/// list / save の RETURNING で共通利用する列。監査列は ISO8601(UTC) 文字列で返す。
const SERVER_COLUMNS: &str = "id, name, environment, base_url, description, variables,
    health_path, expected_status, timeout_ms, enabled,
    to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"'),
    to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')";

/// 接続中DBの rv_meta.openapi_servers を管理し、サーバーへの導通確認を行う。
pub struct ServerService {
    target: PgTarget,
}

fn db_err(error: tokio_postgres::Error) -> AppError {
    AppError::database(&format!("query failed: {error}"))
}

fn server_from_row(row: &Row) -> Server {
    Server {
        id: row.get(0),
        name: row.get(1),
        environment: row.get(2),
        base_url: row.get(3),
        description: row.get(4),
        variables: row.get(5),
        health_path: row.get(6),
        expected_status: row.get(7),
        timeout_ms: row.get(8),
        enabled: row.get(9),
        created_at: row.get(10),
        updated_at: row.get(11),
    }
}

impl ServerService {
    pub fn new(target: PgTarget) -> Self {
        Self { target }
    }

    pub async fn list(&self) -> Result<Vec<ServerSummaryDto>, AppError> {
        let client = pg::connect(&self.target).await?;
        let sql = format!("SELECT {SERVER_COLUMNS} FROM rv_meta.openapi_servers ORDER BY environment, name");
        let rows = client.query(&sql, &[]).await.map_err(db_err)?;
        Ok(rows
            .iter()
            .map(|row| ServerSummaryDto::from_domain(&server_from_row(row)))
            .collect())
    }

    pub async fn save(&self, request: SaveServerRequest) -> Result<ServerSummaryDto, AppError> {
        if request.name.trim().is_empty() {
            return Err(AppError::validation("name is required"));
        }
        if request.base_url.trim().is_empty() {
            return Err(AppError::validation("base_url is required"));
        }

        let client = pg::connect(&self.target).await?;
        // created_at / updated_at は DB 側（デフォルト値と更新トリガー）が管理するため設定しない。
        let row = match request.id {
            Some(id) => {
                let sql = format!(
                    "UPDATE rv_meta.openapi_servers
                     SET name = $2, environment = $3, base_url = $4, description = $5,
                         variables = $6, health_path = $7, expected_status = $8,
                         timeout_ms = $9, enabled = $10
                     WHERE id = $1
                     RETURNING {SERVER_COLUMNS}"
                );
                client
                    .query_one(
                        &sql,
                        &[
                            &id,
                            &request.name,
                            &request.environment,
                            &request.base_url,
                            &request.description,
                            &request.variables,
                            &request.health_path,
                            &request.expected_status,
                            &request.timeout_ms,
                            &request.enabled,
                        ],
                    )
                    .await
                    .map_err(db_err)?
            }
            None => {
                let sql = format!(
                    "INSERT INTO rv_meta.openapi_servers(
                         name, environment, base_url, description, variables,
                         health_path, expected_status, timeout_ms, enabled)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     RETURNING {SERVER_COLUMNS}"
                );
                client
                    .query_one(
                        &sql,
                        &[
                            &request.name,
                            &request.environment,
                            &request.base_url,
                            &request.description,
                            &request.variables,
                            &request.health_path,
                            &request.expected_status,
                            &request.timeout_ms,
                            &request.enabled,
                        ],
                    )
                    .await
                    .map_err(db_err)?
            }
        };
        Ok(ServerSummaryDto::from_domain(&server_from_row(&row)))
    }

    pub async fn delete(&self, id: i32) -> Result<(), AppError> {
        let client = pg::connect(&self.target).await?;
        // ドキュメントに割り当て済み（openapi_document_servers）の場合は FK 制約で失敗する。
        client
            .execute("DELETE FROM rv_meta.openapi_servers WHERE id = $1", &[&id])
            .await
            .map_err(db_err)?;
        Ok(())
    }

    /// 導通確認。DB は使わず HTTP GET のみ行う。判定はサーバー定義の expected_status / timeout_ms を用いる。
    pub async fn test(&self, request: TestServerRequest) -> Result<TestServerResponse, AppError> {
        let expected_status = request.expected_status;
        let resolved = resolve_base_url(&request.base_url, request.variables.as_ref());
        let base = request
            .base_url_override
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
            .unwrap_or(resolved);

        if !(base.starts_with("http://") || base.starts_with("https://")) {
            return Ok(TestServerResponse {
                is_ok: false,
                url: base.clone(),
                status: None,
                expected_status,
                latency_ms: None,
                message: format!(
                    "resolved URL '{base}' is not absolute; provide an absolute base URL to test connectivity"
                ),
            });
        }

        let url = join_url(&base, request.health_path.as_deref().unwrap_or_default());
        let timeout = Duration::from_millis(request.timeout_ms.max(1) as u64);

        let client = match reqwest::Client::builder().timeout(timeout).build() {
            Ok(client) => client,
            Err(error) => return Err(AppError::io(&format!("http client error: {error}"))),
        };

        let started = Instant::now();
        match client.get(&url).send().await {
            Ok(response) => {
                let latency = started.elapsed().as_millis() as u64;
                let status = response.status();
                let matched = status.as_u16() as i32 == expected_status;
                let reason = status
                    .canonical_reason()
                    .map(str::to_string)
                    .unwrap_or_else(|| status.to_string());
                let message = if matched {
                    reason
                } else {
                    format!("{reason} (expected {expected_status})")
                };
                Ok(TestServerResponse {
                    is_ok: matched,
                    url,
                    status: Some(status.as_u16()),
                    expected_status,
                    latency_ms: Some(latency),
                    message,
                })
            }
            Err(error) => Ok(TestServerResponse {
                is_ok: false,
                url,
                status: None,
                expected_status,
                latency_ms: None,
                message: format!("request failed: {error}"),
            }),
        }
    }
}

/// base_url 内の `{var}` を、server variables の default 値で置換する。
fn resolve_base_url(base_url: &str, variables: Option<&Value>) -> String {
    let mut resolved = base_url.to_string();
    if let Some(Value::Object(map)) = variables {
        for (name, spec) in map {
            if let Some(default) = spec.get("default").and_then(Value::as_str) {
                resolved = resolved.replace(&format!("{{{name}}}"), default);
            }
        }
    }
    resolved
}

/// ベースURLとパスを、スラッシュ重複なしで結合する。
fn join_url(base: &str, path: &str) -> String {
    let trimmed_path = path.trim();
    if trimmed_path.is_empty() {
        return base.to_string();
    }
    let base = base.trim_end_matches('/');
    if trimmed_path.starts_with('/') {
        format!("{base}{trimmed_path}")
    } else {
        format!("{base}/{trimmed_path}")
    }
}
