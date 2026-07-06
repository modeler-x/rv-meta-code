use serde::{Deserialize, Serialize};

/// ローカルに保持するデータベース接続情報。
/// `password` はユーザー定義の秘匿情報で、永続化時に暗号化される。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: String,
    pub database: String,
    pub user: String,
    #[serde(default)]
    pub password: String,
    pub is_current: bool,
}
