use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// SDK 生成要求。入力は検証済み OpenAPI Document と生成設定だけ（rv-meta テーブルを読まない）。
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateSdkRequest {
    /// 使用する Generator（Adapter）の識別子。例: openapi-generator-cli。
    pub generator_id: String,
    pub schema_name: String,
    /// 検証済みの完全な OpenAPI JSON（不変な入力 Snapshot）。
    pub openapi_document: Value,
    /// Generator の言語/ジェネレータ名。例: typescript-fetch。
    pub language: String,
    pub package_name: String,
    #[serde(default)]
    pub package_version: Option<String>,
    pub output_directory: String,
    /// Generator 追加プロパティ（キー=値）。
    #[serde(default)]
    pub additional_properties: BTreeMap<String, String>,
}

/// SDK 生成結果。
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GenerateSdkResult {
    pub generator_id: String,
    pub output_directory: String,
    /// 出力ディレクトリからの相対パスで列挙した生成ファイル。
    pub generated_files: Vec<String>,
    pub warnings: Vec<String>,
    pub duration_ms: u64,
}

/// Generator の能力（存在・version・対応言語）。
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GeneratorCapabilities {
    pub generator_id: String,
    pub is_available: bool,
    pub version: Option<String>,
}
