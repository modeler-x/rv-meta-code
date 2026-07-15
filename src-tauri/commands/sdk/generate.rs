use crate::application::facade_generator::{FacadeGenerator, FacadeRequest};
use crate::application::generator_registry::GeneratorRegistry;
use crate::application::openapi_validator::{DefaultOpenApiValidator, OpenApiValidator};
use crate::dto::sdk_dto::{GenerateSdkRequest, GenerateSdkResult};
use crate::errors::app_error::AppError;
use crate::infrastructure::default_generator_registry::DefaultGeneratorRegistry;
use crate::infrastructure::typescript_facade_generator::TypeScriptFacadeGenerator;

/// SDK を生成する。処理順: 入力検証 → OpenAPI 検証 → Generator 実行。
/// 不正な OpenAPI からは生成を開始しない。Generator は Registry から解決し、固有処理は Adapter に閉じ込める。
#[tauri::command]
pub async fn generate_sdk(request: GenerateSdkRequest) -> Result<GenerateSdkResult, AppError> {
    log::info!(
        "generate_sdk start: schema={} generator={} target={} output={}",
        request.schema_name,
        request.generator_id,
        request.generator_name,
        request.output_directory
    );

    if request.schema_name.trim().is_empty()
        || request.generator_name.trim().is_empty()
        || request.package_name.trim().is_empty()
        || request.output_directory.trim().is_empty()
    {
        return Err(AppError::validation(
            "schemaName, generatorName, packageName and outputDirectory are required",
        ));
    }

    // Adapter は Registry から解決する（未登録は NOT_AVAILABLE）。
    let registry = DefaultGeneratorRegistry::new();
    if registry.generator(&request.generator_id).is_none() {
        return Err(AppError::generator_not_available(&format!(
            "unsupported generator \"{}\"",
            request.generator_id
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

    // Generator 実行はブロッキング（Process + FS）。専用スレッドで動かす。
    // 標準 SDK 生成に成功したら、TypeScript では Operation Group Facade を追加生成する。
    let is_typescript = request.generator_name.starts_with("typescript");
    let result = tauri::async_runtime::spawn_blocking(move || {
        let registry = DefaultGeneratorRegistry::new();
        let adapter = registry
            .generator(&request.generator_id)
            .ok_or_else(|| AppError::generator_not_available(&format!(
                "unsupported generator \"{}\"",
                request.generator_id
            )))?;
        let mut generated = adapter.generate(&request)?;
        if is_typescript {
            let facade = TypeScriptFacadeGenerator::new().generate(&FacadeRequest {
                openapi_document: request.openapi_document.clone(),
                output_directory: generated.output_directory.clone(),
            })?;
            generated.generated_files.extend(facade.generated_files);
            generated.generated_files.sort();
            generated.generated_files.dedup();
        }
        Ok::<GenerateSdkResult, AppError>(generated)
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
