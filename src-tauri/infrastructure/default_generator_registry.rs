use std::time::Duration;

use crate::application::generator_registry::{
    openapi_generator_targets, target_properties, GeneratorRegistry,
};
use crate::application::sdk_generator::SdkGenerator;
use crate::dto::sdk_dto::{GeneratorDescriptor, GeneratorTargetDescriptor};
use crate::infrastructure::openapi_generator_adapter::{
    CommandRunner, OpenApiGeneratorCliAdapter, RunOutcome, SystemCommandRunner,
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
        let adapter = OpenApiGeneratorCliAdapter::new(SystemCommandRunner, program.clone(), None);
        let (is_available, version) = match adapter.capabilities() {
            Ok(caps) => (caps.is_available, caps.version),
            Err(_) => (false, None),
        };
        // 利用可能なら CLI から CLIENT generators を動的列挙する（対応言語を絞らない）。
        // 未導入 / 列挙失敗時は代表的な curated 一覧へフォールバックする。
        let targets = if is_available {
            let listed = list_client_targets(&program);
            if listed.is_empty() {
                openapi_generator_targets()
            } else {
                listed
            }
        } else {
            openapi_generator_targets()
        };
        vec![GeneratorDescriptor {
            id: OPENAPI_GENERATOR_CLI_ID.to_string(),
            display_name: "OpenAPI Generator CLI".to_string(),
            is_available,
            version,
            targets,
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

/// `openapi-generator-cli list` を実行し、CLIENT generators を TargetDescriptor へ変換する。
/// SDK 用途のため CLIENT のみ対象（SERVER/DOCUMENTATION 等は除外）。失敗時は空。
fn list_client_targets(program: &str) -> Vec<GeneratorTargetDescriptor> {
    let outcome = SystemCommandRunner.run(program, &["list".to_string()], Duration::from_secs(30));
    let stdout = match outcome {
        RunOutcome::Completed { code: 0, stdout, .. } => stdout,
        _ => return Vec::new(),
    };
    parse_client_generators(&stdout)
        .into_iter()
        .map(|name| {
            let (family, package_property, version_property) = target_properties(&name);
            GeneratorTargetDescriptor {
                name: name.clone(),
                display_name: name,
                family: family.to_string(),
                package_property: package_property.to_string(),
                version_property: version_property.to_string(),
            }
        })
        .collect()
}

/// `list` 出力から CLIENT generators セクションの generator 名を抽出する。
/// 行は "    - name (beta)" 形式。安定度サフィックス "(beta)" 等は名前から除く。
fn parse_client_generators(stdout: &str) -> Vec<String> {
    let mut names = Vec::new();
    let mut in_client = false;
    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.ends_with("generators:") {
            in_client = trimmed == "CLIENT generators:";
            continue;
        }
        if in_client {
            if let Some(rest) = trimmed.strip_prefix("- ") {
                let name = rest.split_whitespace().next().unwrap_or("").to_string();
                if !name.is_empty() {
                    names.push(name);
                }
            }
        }
    }
    names
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

    #[test]
    fn parse_client_generators_extracts_only_client_section() {
        let stdout = "\
The following generators are available:

CLIENT generators:
    - go
    - python
    - typescript-fetch
    - cpp-tiny (beta)

SERVER generators:
    - go-server
    - spring

DOCUMENTATION generators:
    - html2
";
        let names = parse_client_generators(stdout);
        assert!(names.contains(&"go".to_string()));
        assert!(names.contains(&"python".to_string()));
        assert!(names.contains(&"typescript-fetch".to_string()));
        // 安定度サフィックスは名前から除く。
        assert!(names.contains(&"cpp-tiny".to_string()));
        // SERVER / DOCUMENTATION は含めない。
        assert!(!names.contains(&"go-server".to_string()));
        assert!(!names.contains(&"spring".to_string()));
        assert!(!names.contains(&"html2".to_string()));
    }
}
