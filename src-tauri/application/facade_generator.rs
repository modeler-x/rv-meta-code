use serde_json::Value;

use crate::errors::app_error::AppError;

/// Operation Group Facade 生成の入力。標準 SDK（openapi-generator 出力）へラッパを追加する。
/// 入力は最終 OpenAPI（x-rv-operation-group + operationId）と、標準 SDK の出力先。
pub struct FacadeRequest {
    pub openapi_document: Value,
    pub output_directory: String,
}

/// Facade 生成結果（出力先からの相対パス）。
pub struct FacadeResult {
    pub generated_files: Vec<String>,
}

/// Operation Group 単位の Facade を生成する Application 層 Port。
/// 言語別のコード生成は Infrastructure Adapter に隔離する（TypeScript から着手）。
pub trait FacadeGenerator {
    fn generate(&self, request: &FacadeRequest) -> Result<FacadeResult, AppError>;
}
