use serde::{Deserialize, Serialize};

/// SDK Generation Profile。生成設定に名前を付けて端末へ保存し、再入力を不要にする。
/// IPC と永続化の双方でこの型を用いる（機密を含まないため平文 JSON）。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SdkGenerationProfileDto {
    /// 一意なプロファイル名（保存キー）。
    pub name: String,
    /// 紐づくスキーマ名（任意）。未指定は全スキーマ共通。
    #[serde(default)]
    pub schema_name: Option<String>,
    /// Adapter 識別子。例: openapi-generator-cli。
    pub generator_id: String,
    /// generator name（生成器名）。例: typescript-fetch。
    pub generator_name: String,
    pub package_name: String,
    #[serde(default)]
    pub package_version: Option<String>,
    pub output_directory: String,
}
