use crate::application::openapi_validator::{DefaultOpenApiValidator, OpenApiValidator};
use crate::application::sdk_generator::SdkGenerator;
use crate::dto::sdk_dto::{GenerateSdkRequest, GenerateSdkResult};
use crate::errors::app_error::AppError;
use crate::infrastructure::openapi_generator_adapter::{
    OpenApiGeneratorCliAdapter, SystemCommandRunner,
};

const SUPPORTED_GENERATOR: &str = "openapi-generator-cli";

/// 実行する CLI プログラムを解決する。
/// 1. env RV_OPENAPI_GENERATOR_CLI（絶対パス等）
/// 2. ローカル node_modules/.bin（dev の CWD 直下 or src-tauri から一つ上）
/// 3. PATH 上の openapi-generator-cli
fn resolve_generator_program() -> String {
    if let Ok(program) = std::env::var("RV_OPENAPI_GENERATOR_CLI") {
        log::info!("generate_sdk: program from env RV_OPENAPI_GENERATOR_CLI = {program}");
        return program;
    }
    for candidate in [
        "node_modules/.bin/openapi-generator-cli",
        "../node_modules/.bin/openapi-generator-cli",
    ] {
        if std::path::Path::new(candidate).exists() {
            let resolved = std::fs::canonicalize(candidate)
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|_| candidate.to_string());
            log::info!("generate_sdk: program resolved to local bin = {resolved}");
            return resolved;
        }
    }
    log::info!("generate_sdk: program falling back to PATH = {SUPPORTED_GENERATOR}");
    SUPPORTED_GENERATOR.to_string()
}

/// SDK を生成する。処理順: 入力検証 → OpenAPI 検証 → Generator 実行。
/// 不正な OpenAPI からは生成を開始しない。Generator 固有処理は Adapter に閉じ込める。
#[tauri::command]
pub async fn generate_sdk(request: GenerateSdkRequest) -> Result<GenerateSdkResult, AppError> {
    log::info!(
        "generate_sdk start: schema={} generator={} language={} output={}",
        request.schema_name,
        request.generator_id,
        request.language,
        request.output_directory
    );

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
        log::error!(
            "generate_sdk: OpenAPI invalid ({} error(s)): {}",
            report.errors.len(),
            report
                .errors
                .iter()
                .map(|i| format!("{}@{} {}", i.rule, i.pointer, i.message))
                .collect::<Vec<_>>()
                .join(" | ")
        );
        return Err(AppError::openapi_validation(&format!(
            "openapi document is invalid ({} error(s)): {summary}",
            report.errors.len()
        )));
    }

    let program = resolve_generator_program();
    log::info!(
        "generate_sdk: cwd={:?} PATH={:?}",
        std::env::current_dir().ok(),
        std::env::var("PATH").unwrap_or_default()
    );

    // Generator 実行はブロッキング（Process + FS）。専用スレッドで動かす。
    let result = tauri::async_runtime::spawn_blocking(move || {
        let adapter = OpenApiGeneratorCliAdapter::new(SystemCommandRunner, program, None);
        adapter.generate(&request)
    })
    .await
    .map_err(|error| AppError::sdk_generation_failed(&format!("task join failed: {error}")))?;

    match &result {
        Ok(ok) => log::info!(
            "generate_sdk done: {} file(s) in {} ({} ms)",
            ok.generated_files.len(),
            ok.output_directory,
            ok.duration_ms
        ),
        Err(error) => log::error!("generate_sdk failed: {} {}", error.code, error.message),
    }
    result
}
