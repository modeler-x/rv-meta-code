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
    /// OpenAPI Generator の generator name（言語ではなく生成器名）。例: typescript-fetch / python / ruby。
    pub generator_name: String,
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

/// Registry が UI へ返す Adapter 記述子。UI は固定配列を持たず、これを一覧化する。
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GeneratorDescriptor {
    /// Adapter 識別子。generate 要求の generator_id に対応。例: openapi-generator-cli。
    pub id: String,
    pub display_name: String,
    pub is_available: bool,
    pub version: Option<String>,
    /// 対応する生成ターゲット（generator name）一覧。
    pub targets: Vec<GeneratorTargetDescriptor>,
}

/// 生成ターゲット（generator name）の記述子。package 命名の family と
/// additional-properties キーを含み、言語別 config 変換の単一の情報源にする。
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GeneratorTargetDescriptor {
    /// generator name。generate 要求の generator_name に対応。例: typescript-fetch。
    pub name: String,
    pub display_name: String,
    /// package 命名の family。例: typescript / python / ruby / generic。
    pub family: String,
    /// package 名を渡す additional-property キー。例: npmName / packageName / gemName。
    pub package_property: String,
    /// package version を渡す additional-property キー。例: npmVersion / packageVersion / gemVersion。
    pub version_property: String,
}
