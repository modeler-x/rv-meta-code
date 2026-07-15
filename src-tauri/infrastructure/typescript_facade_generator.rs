use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;

use serde_json::Value;

use crate::application::facade_generator::{FacadeGenerator, FacadeRequest, FacadeResult};
use crate::errors::app_error::AppError;
use crate::utils::naming::{lower_camel, pascal_case};

const HTTP_METHODS: [&str; 8] = [
    "get", "put", "post", "delete", "options", "head", "patch", "trace",
];

/// Facade の1メソッド。標準 SDK の <api_class>.<api_method> をラップする。
struct FacadeMethod {
    name: String,
    api_class: String,
    api_method: String,
}

/// Operation Group ごとの Facade Service。
struct FacadeService {
    class_name: String,
    field_name: String,
    methods: Vec<FacadeMethod>,
}

impl FacadeService {
    fn api_classes(&self) -> BTreeSet<String> {
        self.methods.iter().map(|m| m.api_class.clone()).collect()
    }
}

/// openapi-generator(typescript-fetch)の出力を Operation Group Facade へラップする Adapter。
/// x-rv-operation-group.key を SDK Service、operationId から group prefix を除いた名を SDK method にする。
/// Auth 固有の分岐は持たない（任意の Operation Group に適用）。
pub struct TypeScriptFacadeGenerator;

impl TypeScriptFacadeGenerator {
    pub fn new() -> Self {
        Self
    }
}

impl Default for TypeScriptFacadeGenerator {
    fn default() -> Self {
        Self::new()
    }
}

impl FacadeGenerator for TypeScriptFacadeGenerator {
    fn generate(&self, request: &FacadeRequest) -> Result<FacadeResult, AppError> {
        let services = build_facade_model(&request.openapi_document);
        if services.is_empty() {
            return Ok(FacadeResult { generated_files: vec![] });
        }

        let facade_dir = Path::new(&request.output_directory).join("src").join("facade");
        std::fs::create_dir_all(&facade_dir)
            .map_err(|e| AppError::sdk_generation_failed(&format!("cannot create facade dir: {e}")))?;

        let mut generated = Vec::new();
        for service in &services {
            let file = format!("{}.ts", service.class_name);
            std::fs::write(facade_dir.join(&file), emit_service(service))
                .map_err(|e| AppError::sdk_generation_failed(&format!("cannot write {file}: {e}")))?;
            generated.push(format!("src/facade/{file}"));
        }
        std::fs::write(facade_dir.join("RvClient.ts"), emit_rv_client(&services))
            .map_err(|e| AppError::sdk_generation_failed(&format!("cannot write RvClient.ts: {e}")))?;
        generated.push("src/facade/RvClient.ts".to_string());

        std::fs::write(facade_dir.join("index.ts"), emit_index(&services))
            .map_err(|e| AppError::sdk_generation_failed(&format!("cannot write facade index.ts: {e}")))?;
        generated.push("src/facade/index.ts".to_string());

        generated.sort();
        Ok(FacadeResult { generated_files: generated })
    }
}

/// OpenAPI から x-rv-operation-group を持つ Operation を集め、Group 単位の Facade モデルにする。
fn build_facade_model(document: &Value) -> Vec<FacadeService> {
    // key -> Vec<FacadeMethod>
    let mut groups: BTreeMap<String, Vec<FacadeMethod>> = BTreeMap::new();

    let Some(paths) = document.get("paths").and_then(Value::as_object) else {
        return vec![];
    };
    for item in paths.values() {
        let Some(item) = item.as_object() else { continue };
        for (method, op) in item {
            if !HTTP_METHODS.contains(&method.as_str()) || !op.is_object() {
                continue;
            }
            let Some(key) = op
                .get("x-rv-operation-group")
                .and_then(|g| g.get("key"))
                .and_then(Value::as_str)
            else {
                continue;
            };
            let Some(operation_id) = op.get("operationId").and_then(Value::as_str) else {
                continue;
            };

            let prefix = lower_camel(key);
            let facade_name = match operation_id.strip_prefix(prefix.as_str()) {
                Some(rest) if !rest.is_empty() => first_lower(rest),
                _ => first_lower(operation_id),
            };
            let first_tag = op
                .get("tags")
                .and_then(Value::as_array)
                .and_then(|tags| tags.first())
                .and_then(Value::as_str);
            let api_class = match first_tag {
                Some(tag) => format!("{}Api", pascal_case(tag)),
                None => "DefaultApi".to_string(),
            };

            groups.entry(key.to_string()).or_default().push(FacadeMethod {
                name: facade_name,
                api_class,
                api_method: first_lower(operation_id),
            });
        }
    }

    groups
        .into_iter()
        .map(|(key, mut methods)| {
            methods.sort_by(|a, b| a.name.cmp(&b.name));
            FacadeService {
                class_name: format!("{}Service", pascal_case(&key)),
                field_name: lower_camel(&key),
                methods,
            }
        })
        .collect()
}

fn first_lower(text: &str) -> String {
    let mut chars = text.chars();
    match chars.next() {
        Some(first) => first.to_ascii_lowercase().to_string() + chars.as_str(),
        None => String::new(),
    }
}

/// API class 名（PascalCase の1語）はフィールド名として先頭のみ小文字化する。
/// lower_camel は単語区切りが無いと全小文字化してしまうため使わない（ExampleApi -> exampleApi）。
fn api_field(api_class: &str) -> String {
    first_lower(api_class)
}

/// 1つの Facade Service を TypeScript として出力する。標準 SDK のメソッドへ型安全に委譲する。
fn emit_service(service: &FacadeService) -> String {
    let api_classes = service.api_classes();
    let mut out = String::new();
    out.push_str("import type { Configuration } from '../runtime';\n");
    out.push_str(&format!(
        "import {{ {} }} from '../apis';\n\n",
        api_classes.iter().cloned().collect::<Vec<_>>().join(", ")
    ));
    out.push_str(&format!("export class {} {{\n", service.class_name));
    for api_class in &api_classes {
        out.push_str(&format!("  private readonly {}: {};\n", api_field(api_class), api_class));
    }
    out.push_str("\n  constructor(configuration?: Configuration) {\n");
    for api_class in &api_classes {
        out.push_str(&format!(
            "    this.{} = new {}(configuration);\n",
            api_field(api_class),
            api_class
        ));
    }
    out.push_str("  }\n");
    for method in &service.methods {
        out.push_str(&format!(
            "\n  {name}(...args: Parameters<{cls}['{m}']>): ReturnType<{cls}['{m}']> {{\n    return this.{field}.{m}(...args);\n  }}\n",
            name = method.name,
            cls = method.api_class,
            m = method.api_method,
            field = api_field(&method.api_class)
        ));
    }
    out.push_str("}\n");
    out
}

/// RvClient を出力する（各 Service を Group key のフィールドで公開）。
fn emit_rv_client(services: &[FacadeService]) -> String {
    let mut out = String::new();
    out.push_str("import type { Configuration } from '../runtime';\n");
    for service in services {
        out.push_str(&format!("import {{ {c} }} from './{c}';\n", c = service.class_name));
    }
    out.push_str("\nexport class RvClient {\n");
    for service in services {
        out.push_str(&format!("  readonly {}: {};\n", service.field_name, service.class_name));
    }
    out.push_str("\n  constructor(configuration?: Configuration) {\n");
    for service in services {
        out.push_str(&format!(
            "    this.{} = new {}(configuration);\n",
            service.field_name, service.class_name
        ));
    }
    out.push_str("  }\n}\n");
    out
}

fn emit_index(services: &[FacadeService]) -> String {
    let mut out = String::from("export { RvClient } from './RvClient';\n");
    for service in services {
        out.push_str(&format!("export {{ {c} }} from './{c}';\n", c = service.class_name));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    // Auth 非依存の架空 Operation Group（Example + exampleGetItem -> rv.example.getItem()）。
    fn example_document() -> Value {
        json!({
            "openapi": "3.0.3",
            "info": { "title": "t", "version": "1" },
            "paths": {
                "/example/items/{itemId}": {
                    "get": {
                        "operationId": "exampleGetItem",
                        "tags": ["Example"],
                        "x-rv-operation-group": { "key": "example", "name": "Example" },
                        "responses": { "200": { "description": "OK" } }
                    }
                }
            }
        })
    }

    #[test]
    fn derives_service_and_method_from_group_and_operation_id() {
        let services = build_facade_model(&example_document());
        assert_eq!(services.len(), 1);
        let service = &services[0];
        assert_eq!(service.class_name, "ExampleService");
        assert_eq!(service.field_name, "example");
        assert_eq!(service.methods.len(), 1);
        let method = &service.methods[0];
        assert_eq!(method.name, "getItem");
        assert_eq!(method.api_class, "ExampleApi");
        assert_eq!(method.api_method, "exampleGetItem");
    }

    #[test]
    fn emit_service_delegates_to_the_generated_api() {
        let services = build_facade_model(&example_document());
        let code = emit_service(&services[0]);
        assert!(code.contains("import { ExampleApi } from '../apis';"));
        assert!(code.contains("export class ExampleService"));
        assert!(code.contains("getItem(...args: Parameters<ExampleApi['exampleGetItem']>)"));
        assert!(code.contains("return this.exampleApi.exampleGetItem(...args);"));
    }

    #[test]
    fn emit_rv_client_exposes_service_by_group_key() {
        let services = build_facade_model(&example_document());
        let code = emit_rv_client(&services);
        assert!(code.contains("readonly example: ExampleService;"));
        assert!(code.contains("this.example = new ExampleService(configuration);"));
    }

    #[test]
    fn tag_and_group_are_independent() {
        // tags=[Auth Admin] だが group key=auth -> Service は auth、api class は tag 由来。
        let doc = json!({
            "openapi": "3.0.3",
            "info": { "title": "t", "version": "1" },
            "paths": { "/auth/users/{userId}": { "get": {
                "operationId": "authGetUser",
                "tags": ["Auth Admin"],
                "x-rv-operation-group": { "key": "auth", "name": "Auth" },
                "responses": { "200": { "description": "OK" } }
            }}}
        });
        let services = build_facade_model(&doc);
        assert_eq!(services[0].field_name, "auth");
        assert_eq!(services[0].class_name, "AuthService");
        assert_eq!(services[0].methods[0].name, "getUser");
        assert_eq!(services[0].methods[0].api_class, "AuthAdminApi");
        assert_eq!(services[0].methods[0].api_method, "authGetUser");
    }

    #[test]
    fn generate_writes_facade_files() {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir().join(format!("rvfacade-{nanos}"));
        let request = FacadeRequest {
            openapi_document: example_document(),
            output_directory: root.to_string_lossy().to_string(),
        };
        let result = TypeScriptFacadeGenerator::new().generate(&request).unwrap();
        assert!(result.generated_files.contains(&"src/facade/ExampleService.ts".to_string()));
        assert!(result.generated_files.contains(&"src/facade/RvClient.ts".to_string()));
        assert!(root.join("src/facade/ExampleService.ts").exists());
        let _ = std::fs::remove_dir_all(&root);
    }
}
