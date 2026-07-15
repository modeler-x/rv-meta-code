use crate::application::openapi_validator::{DefaultOpenApiValidator, OpenApiValidator};
use crate::application::sdk_generator::SdkGenerator;
use crate::dto::sdk_dto::{GenerateSdkRequest, GenerateSdkResult};
use crate::errors::app_error::AppError;
use crate::infrastructure::openapi_generator_adapter::{
    OpenApiGeneratorCliAdapter, SystemCommandRunner,
};

const SUPPORTED_GENERATOR: &str = "openapi-generator-cli";

/// SDK を生成する。処理順: 入力検証 → OpenAPI 検証 → Generator 実行。
/// 不正な OpenAPI からは生成を開始しない。Generator 固有処理は Adapter に閉じ込める。
#[tauri::command]
pub async fn generate_sdk(request: GenerateSdkRequest) -> Result<GenerateSdkResult, AppError> {
    if request.schema_name.trim().is_empty()
        || request.language.trim().is_empty()
        || request.package_name.trim().is_empty()
        || request.output_directory.trim().is_empty()
    {
        return Err(AppError::validation(
            "schemaName, language, packageName and outputDirectory are required",
        ));
    }
    if request.generator_id != SUPPORTED_GENERATOR {
        return Err(AppError::generator_not_available(&format!(
            "unsupported generator \"{}\" (only {} is available)",
            request.generator_id, SUPPORTED_GENERATOR
        )));
    }

    // 不正な OpenAPI からは生成しない（Validator を通す）。
    let report = DefaultOpenApiValidator::new().validate(&request.openapi_document);
    if !report.is_valid {
        let summary = report
            .errors
            .iter()
            .take(3)
            .map(|issue| format!("{}: {}", issue.rule, issue.message))
            .collect::<Vec<_>>()
            .join("; ");
        return Err(AppError::openapi_validation(&format!(
            "openapi document is invalid ({} error(s)): {summary}",
            report.errors.len()
        )));
    }

    // 実行する CLI プログラム。既定は PATH 上の openapi-generator-cli。
    // env RV_OPENAPI_GENERATOR_CLI で絶対パス等へ差し替え可能（ローカル node_modules/.bin 等）。
    let program =
        std::env::var("RV_OPENAPI_GENERATOR_CLI").unwrap_or_else(|_| SUPPORTED_GENERATOR.to_string());

    // Generator 実行はブロッキング（Process + FS）。専用スレッドで動かす。
    tauri::async_runtime::spawn_blocking(move || {
        let adapter = OpenApiGeneratorCliAdapter::new(SystemCommandRunner, program, None);
        adapter.generate(&request)
    })
    .await
    .map_err(|error| AppError::sdk_generation_failed(&format!("task join failed: {error}")))?
}
