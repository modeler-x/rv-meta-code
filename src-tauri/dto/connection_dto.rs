use serde::{Deserialize, Serialize};

use crate::domain::connection::Connection;

/// フロントエンドへ返す接続情報。秘匿値（password）は含めず、
/// 設定済みかどうかだけを `has_password` で伝える。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionSummaryDto {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: String,
    pub database: String,
    pub user: String,
    pub is_current: bool,
    pub has_password: bool,
}

impl ConnectionSummaryDto {
    pub fn from_domain(connection: &Connection) -> Self {
        Self {
            id: connection.id.clone(),
            name: connection.name.clone(),
            host: connection.host.clone(),
            port: connection.port.clone(),
            database: connection.database.clone(),
            user: connection.user.clone(),
            is_current: connection.is_current,
            has_password: !connection.password.is_empty(),
        }
    }
}

/// 接続の新規作成・更新リクエスト。
/// `id` が空/未指定なら新規、それ以外は更新。
/// `password` が None/空文字なら既存パスワードを維持する。
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveConnectionRequest {
    #[serde(default)]
    pub id: Option<String>,
    pub name: String,
    pub host: String,
    pub port: String,
    pub database: String,
    pub user: String,
    #[serde(default)]
    pub password: Option<String>,
}

/// 接続テストのリクエスト。`id` を指定した場合、未入力項目は保存済みの値で補完する。
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestConnectionRequest {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub host: String,
    #[serde(default)]
    pub port: String,
    #[serde(default)]
    pub database: String,
    #[serde(default)]
    pub user: String,
    #[serde(default)]
    pub password: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TestConnectionResponse {
    pub is_ok: bool,
    pub message: String,
    pub server_version: Option<String>,
}
