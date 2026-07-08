use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::domain::server::Server;

/// フロントエンドへ返すサーバー情報。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerSummaryDto {
    pub id: i32,
    pub name: String,
    pub environment: String,
    pub base_url: String,
    pub description: Option<String>,
    pub variables: Option<Value>,
    pub health_path: Option<String>,
    pub expected_status: i32,
    pub timeout_ms: i32,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl ServerSummaryDto {
    pub fn from_domain(server: &Server) -> Self {
        Self {
            id: server.id,
            name: server.name.clone(),
            environment: server.environment.clone(),
            base_url: server.base_url.clone(),
            description: server.description.clone(),
            variables: server.variables.clone(),
            health_path: server.health_path.clone(),
            expected_status: server.expected_status,
            timeout_ms: server.timeout_ms,
            enabled: server.enabled,
            created_at: server.created_at.clone(),
            updated_at: server.updated_at.clone(),
        }
    }
}

fn default_true() -> bool {
    true
}
fn default_environment() -> String {
    "dev".to_string()
}
fn default_expected_status() -> i32 {
    200
}
fn default_timeout_ms() -> i32 {
    3000
}

/// サーバーの新規作成・更新リクエスト。id が None なら新規。
/// created_at / updated_at は DB（デフォルト値と更新トリガー）が管理するため受け取らない。
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveServerRequest {
    #[serde(default)]
    pub id: Option<i32>,
    pub name: String,
    #[serde(default = "default_environment")]
    pub environment: String,
    pub base_url: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub variables: Option<Value>,
    #[serde(default)]
    pub health_path: Option<String>,
    #[serde(default = "default_expected_status")]
    pub expected_status: i32,
    #[serde(default = "default_timeout_ms")]
    pub timeout_ms: i32,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

/// 導通確認リクエスト。base_url をサーバー変数の default で解決し、health_path を付けて GET する。
/// base_url が相対の場合は base_url_override（絶対URL）で補完する。
/// expected_status / timeout_ms はサーバー定義の永続値を用いる。
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestServerRequest {
    pub base_url: String,
    #[serde(default)]
    pub variables: Option<Value>,
    #[serde(default)]
    pub health_path: Option<String>,
    #[serde(default)]
    pub base_url_override: Option<String>,
    #[serde(default = "default_expected_status")]
    pub expected_status: i32,
    #[serde(default = "default_timeout_ms")]
    pub timeout_ms: i32,
}

/// 導通確認の結果。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TestServerResponse {
    pub is_ok: bool,
    pub url: String,
    pub status: Option<u16>,
    pub expected_status: i32,
    pub latency_ms: Option<u64>,
    pub message: String,
}
