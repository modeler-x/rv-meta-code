use crate::application::generator_registry::{openapi_generator_targets, GeneratorRegistry};
use crate::application::sdk_generator::SdkGenerator;
use crate::dto::sdk_dto::GeneratorDescriptor;
use crate::infrastructure::openapi_generator_adapter::{
    OpenApiGeneratorCliAdapter, SystemCommandRunner,
};

/// openapi-generator-cli Adapter の識別子。
pub const OPENAPI_GENERATOR_CLI_ID: &str = "openapi-generator-cli";

/// 実運用の Registry。当面は openapi-generator-cli の 1 Adapter を登録する。
/// Adapter 追加時はここに登録を増やすだけで list/generate に反映される。
pub struct DefaultGeneratorRegistry;

impl DefaultGeneratorRegistry {
    pub fn new() -> Self {
        Self
    }
}

impl Default for DefaultGeneratorRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl GeneratorRegistry for DefaultGeneratorRegistry {
    fn list(&self) -> Vec<GeneratorDescriptor> {
        let program = resolve_generator_program();
        let adapter = OpenApiGeneratorCliAdapter::new(SystemCommandRunner, program, None);
        let (is_available, version) = match adapter.capabilities() {
            Ok(caps) => (caps.is_available, caps.version),
            Err(_) => (false, None),
        };
        vec![GeneratorDescriptor {
            id: OPENAPI_GENERATOR_CLI_ID.to_string(),
            display_name: "OpenAPI Generator CLI".to_string(),
            is_available,
            version,
            targets: openapi_generator_targets(),
        }]
    }

    fn generator(&self, id: &str) -> Option<Box<dyn SdkGenerator>> {
        if id == OPENAPI_GENERATOR_CLI_ID {
            let program = resolve_generator_program();
            Some(Box::new(OpenApiGeneratorCliAdapter::new(
                SystemCommandRunner,
                program,
                None,
            )))
        } else {
            None
        }
    }
}

/// 実行する CLI プログラムを解決する。
/// 1. env RV_OPENAPI_GENERATOR_CLI（絶対パス等）
/// 2. ローカル node_modules/.bin（dev の CWD 直下 or src-tauri から一つ上）
/// 3. PATH 上の openapi-generator-cli
pub fn resolve_generator_program() -> String {
    if let Ok(program) = std::env::var("RV_OPENAPI_GENERATOR_CLI") {
        log::info!("generator: program from env RV_OPENAPI_GENERATOR_CLI = {program}");
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
            log::info!("generator: program resolved to local bin = {resolved}");
            return resolved;
        }
    }
    log::info!("generator: program falling back to PATH = {OPENAPI_GENERATOR_CLI_ID}");
    OPENAPI_GENERATOR_CLI_ID.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn list_contains_openapi_generator_with_curated_targets() {
        let descriptors = DefaultGeneratorRegistry::new().list();
        let cli = descriptors.iter().find(|d| d.id == OPENAPI_GENERATOR_CLI_ID).unwrap();
        assert!(cli.targets.iter().any(|t| t.name == "typescript-fetch"));
        assert!(cli.targets.iter().any(|t| t.name == "python"));
        assert!(cli.targets.iter().any(|t| t.name == "ruby"));
    }

    #[test]
    fn generator_returns_adapter_for_known_id_and_none_otherwise() {
        let registry = DefaultGeneratorRegistry::new();
        assert!(registry.generator(OPENAPI_GENERATOR_CLI_ID).is_some());
        assert!(registry.generator("unknown-generator").is_none());
    }
}
