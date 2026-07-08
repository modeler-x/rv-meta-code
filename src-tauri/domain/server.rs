use serde::{Deserialize, Serialize};
use serde_json::Value;

/// OpenAPI ドキュメントの servers[] に出力される再利用可能なサーバー定義。
/// 接続中DBの rv_meta.openapi_servers 1行に対応する。
/// health_path / expected_status / timeout_ms は導通確認用で OpenAPI には出力しない。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Server {
    pub id: i32,
    pub name: String,
    pub environment: String,
    pub base_url: String,
    pub description: Option<String>,
    /// OpenAPI server variables オブジェクト（各変数は default を持つ）。
    pub variables: Option<Value>,
    pub health_path: Option<String>,
    pub expected_status: i32,
    pub timeout_ms: i32,
    pub enabled: bool,
    /// 監査列（DB管理・ISO8601 UTC 文字列）。
    pub created_at: String,
    pub updated_at: String,
}
