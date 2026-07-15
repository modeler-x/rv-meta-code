use std::collections::HashSet;

use serde_json::Value;

use crate::dto::validation_dto::{ValidationIssue, ValidationReport};

/// SDK 生成前に OpenAPI Document 全体を検証する Application 層 Port。
/// 具体的な検証ロジックは実装に隠蔽し、UI/Application からは validate だけを使う。
pub trait OpenApiValidator {
    fn validate(&self, document: &Value) -> ValidationReport;
}

/// OpenAPI 3.x の構造的検証を行う既定実装（外部依存なしの純ロジック）。
pub struct DefaultOpenApiValidator;

const HTTP_METHODS: [&str; 8] = [
    "get", "put", "post", "delete", "options", "head", "patch", "trace",
];

impl DefaultOpenApiValidator {
    pub fn new() -> Self {
        Self
    }
}

impl Default for DefaultOpenApiValidator {
    fn default() -> Self {
        Self::new()
    }
}

impl OpenApiValidator for DefaultOpenApiValidator {
    fn validate(&self, document: &Value) -> ValidationReport {
        let mut errors: Vec<ValidationIssue> = Vec::new();
        let mut warnings: Vec<ValidationIssue> = Vec::new();

        check_structure(document, &mut errors);
        check_operations(document, &mut errors, &mut warnings);
        check_operation_id_uniqueness(document, &mut errors);
        check_refs_resolve(document, &mut errors);
        check_security_scheme_references(document, &mut errors);

        ValidationReport::new(errors, warnings)
    }
}

/// JSON Pointer の1セグメントをエスケープする（`~`→`~0`、`/`→`~1`）。
fn escape_pointer(segment: &str) -> String {
    segment.replace('~', "~0").replace('/', "~1")
}

fn operation_pointer(path: &str, method: &str) -> String {
    format!("/paths/{}/{}", escape_pointer(path), method)
}

/// Document 内の全 Operation を (path, method, operation) で列挙する。
fn operations(document: &Value) -> Vec<(String, String, Value)> {
    let mut out = Vec::new();
    let Some(paths) = document.get("paths").and_then(Value::as_object) else {
        return out;
    };
    for (path, item) in paths {
        let Some(item) = item.as_object() else { continue };
        for (method, op) in item {
            if HTTP_METHODS.contains(&method.as_str()) && op.is_object() {
                out.push((path.clone(), method.clone(), op.clone()));
            }
        }
    }
    out
}

/// OpenAPI version / info / paths の必須構造。
fn check_structure(document: &Value, errors: &mut Vec<ValidationIssue>) {
    match document.get("openapi").and_then(Value::as_str) {
        Some(version) if version.starts_with("3.") => {}
        Some(version) => errors.push(ValidationIssue::new(
            "/openapi",
            "structure.openapi",
            format!("unsupported OpenAPI version \"{version}\" (expected 3.x)"),
        )),
        None => errors.push(ValidationIssue::new(
            "/openapi",
            "structure.openapi",
            "missing openapi version",
        )),
    }

    match document.get("info").and_then(Value::as_object) {
        Some(info) => {
            if !info.get("title").map(Value::is_string).unwrap_or(false) {
                errors.push(ValidationIssue::new("/info/title", "structure.info", "info.title is required"));
            }
            if !info.get("version").map(Value::is_string).unwrap_or(false) {
                errors.push(ValidationIssue::new("/info/version", "structure.info", "info.version is required"));
            }
        }
        None => errors.push(ValidationIssue::new("/info", "structure.info", "missing info object")),
    }

    if document.get("paths").and_then(Value::as_object).is_none() {
        errors.push(ValidationIssue::new("/paths", "structure.paths", "missing paths object"));
    }
}

/// 各 Operation の responses（2xx 必須）・path parameter 整合・tags を検証する。
fn check_operations(
    document: &Value,
    errors: &mut Vec<ValidationIssue>,
    warnings: &mut Vec<ValidationIssue>,
) {
    for (path, method, op) in operations(document) {
        let pointer = operation_pointer(&path, &method);

        // responses は object で 2xx を1件以上持つ。
        match op.get("responses").and_then(Value::as_object) {
            Some(responses) if !responses.is_empty() => {
                let has_success = responses
                    .keys()
                    .any(|code| code.starts_with('2') || code == "default");
                if !has_success {
                    errors.push(ValidationIssue::new(
                        &format!("{pointer}/responses"),
                        "operation.responses",
                        "operation has no 2xx (success) response",
                    ));
                }
            }
            _ => errors.push(ValidationIssue::new(
                &format!("{pointer}/responses"),
                "operation.responses",
                "operation.responses is required and must be non-empty",
            )),
        }

        // path の {param} と parameters(in=path) の集合一致。
        let path_params = path_template_params(&path);
        let declared_params = declared_path_params(&op);
        if path_params != declared_params {
            errors.push(ValidationIssue::new(
                &format!("{pointer}/parameters"),
                "pathParameter.mismatch",
                format!(
                    "path parameters {:?} do not match declared in=path parameters {:?}",
                    sorted(&path_params),
                    sorted(&declared_params)
                ),
            ));
        }

        // tags は非空を推奨（欠落は警告）。
        let has_tags = op
            .get("tags")
            .and_then(Value::as_array)
            .map(|t| !t.is_empty())
            .unwrap_or(false);
        if !has_tags {
            warnings.push(ValidationIssue::new(
                &format!("{pointer}/tags"),
                "operation.tags",
                "operation has no tags",
            ));
        }
    }
}

fn sorted(set: &HashSet<String>) -> Vec<String> {
    let mut v: Vec<String> = set.iter().cloned().collect();
    v.sort();
    v
}

/// path テンプレートの `{name}` を抽出する。
fn path_template_params(path: &str) -> HashSet<String> {
    let mut out = HashSet::new();
    let mut rest = path;
    while let Some(open) = rest.find('{') {
        if let Some(close_rel) = rest[open + 1..].find('}') {
            let name = &rest[open + 1..open + 1 + close_rel];
            out.insert(name.to_string());
            rest = &rest[open + 1 + close_rel + 1..];
        } else {
            break;
        }
    }
    out
}

/// operation.parameters のうち in=path の name 集合。
fn declared_path_params(op: &Value) -> HashSet<String> {
    let mut out = HashSet::new();
    if let Some(params) = op.get("parameters").and_then(Value::as_array) {
        for p in params {
            if p.get("in").and_then(Value::as_str) == Some("path") {
                if let Some(name) = p.get("name").and_then(Value::as_str) {
                    out.insert(name.to_string());
                }
            }
        }
    }
    out
}

/// operationId の Document 内一意性。
fn check_operation_id_uniqueness(document: &Value, errors: &mut Vec<ValidationIssue>) {
    let mut seen: HashSet<String> = HashSet::new();
    for (path, method, op) in operations(document) {
        if let Some(operation_id) = op.get("operationId").and_then(Value::as_str) {
            if !seen.insert(operation_id.to_string()) {
                errors.push(ValidationIssue::new(
                    &operation_pointer(&path, &method),
                    "operationId.unique",
                    format!("duplicate operationId \"{operation_id}\" within document"),
                ));
            }
        }
    }
}

/// Document 内の全 $ref が解決できることを検証する（外部参照は非対応としてエラー）。
fn check_refs_resolve(document: &Value, errors: &mut Vec<ValidationIssue>) {
    let mut refs: Vec<(String, String)> = Vec::new();
    collect_refs(document, String::new(), &mut refs);
    for (pointer, target) in refs {
        if !ref_resolves(document, &target) {
            errors.push(ValidationIssue::new(
                &pointer,
                "ref.unresolved",
                format!("$ref \"{target}\" does not resolve within the document"),
            ));
        }
    }
}

fn collect_refs(value: &Value, pointer: String, out: &mut Vec<(String, String)>) {
    match value {
        Value::Object(map) => {
            if let Some(Value::String(target)) = map.get("$ref") {
                out.push((format!("{pointer}/$ref"), target.clone()));
            }
            for (key, child) in map {
                collect_refs(child, format!("{pointer}/{}", escape_pointer(key)), out);
            }
        }
        Value::Array(items) => {
            for (index, child) in items.iter().enumerate() {
                collect_refs(child, format!("{pointer}/{index}"), out);
            }
        }
        _ => {}
    }
}

fn ref_resolves(document: &Value, target: &str) -> bool {
    let Some(rest) = target.strip_prefix("#/") else {
        return false; // 外部参照は非対応
    };
    let mut node = document;
    for raw in rest.split('/') {
        let segment = raw.replace("~1", "/").replace("~0", "~");
        node = match node {
            Value::Object(map) => match map.get(&segment) {
                Some(child) => child,
                None => return false,
            },
            Value::Array(items) => match segment.parse::<usize>().ok().and_then(|i| items.get(i)) {
                Some(child) => child,
                None => return false,
            },
            _ => return false,
        };
    }
    true
}

/// operation.security と root security が参照する Security Scheme が定義済みかを検証する。
fn check_security_scheme_references(document: &Value, errors: &mut Vec<ValidationIssue>) {
    let defined: HashSet<String> = document
        .get("components")
        .and_then(|c| c.get("securitySchemes"))
        .and_then(Value::as_object)
        .map(|m| m.keys().cloned().collect())
        .unwrap_or_default();

    let check_requirements = |security: &Value, pointer: &str, errors: &mut Vec<ValidationIssue>| {
        let Some(requirements) = security.as_array() else { return };
        for requirement in requirements {
            let Some(obj) = requirement.as_object() else { continue };
            for scheme in obj.keys() {
                if !defined.contains(scheme) {
                    errors.push(ValidationIssue::new(
                        pointer,
                        "securityScheme.undefined",
                        format!("security references undefined scheme \"{scheme}\""),
                    ));
                }
            }
        }
    };

    if let Some(root_security) = document.get("security") {
        check_requirements(root_security, "/security", errors);
    }
    for (path, method, op) in operations(document) {
        if let Some(security) = op.get("security") {
            let pointer = format!("{}/security", operation_pointer(&path, &method));
            check_requirements(security, &pointer, errors);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn valid_auth_document() -> Value {
        json!({
            "openapi": "3.0.3",
            "info": { "title": "Auth API", "version": "1.0.0" },
            "security": [{ "bearerAuth": [] }],
            "paths": {
                "/auth/users/{userId}": {
                    "get": {
                        "operationId": "authGetUser",
                        "tags": ["Auth"],
                        "security": [{ "bearerAuth": [] }],
                        "parameters": [
                            { "name": "userId", "in": "path", "required": true, "schema": { "type": "integer" } }
                        ],
                        "responses": {
                            "200": { "description": "OK" },
                            "404": { "$ref": "#/components/responses/NotFound" }
                        }
                    }
                }
            },
            "components": {
                "responses": {
                    "NotFound": { "description": "Not Found" }
                },
                "securitySchemes": {
                    "bearerAuth": { "type": "http", "scheme": "bearer" }
                }
            }
        })
    }

    #[test]
    fn valid_document_passes() {
        let report = DefaultOpenApiValidator::new().validate(&valid_auth_document());
        assert!(report.is_valid, "expected valid, errors: {:?}", report.errors);
        assert!(report.errors.is_empty());
    }

    #[test]
    fn missing_version_and_info_are_errors() {
        let report = DefaultOpenApiValidator::new().validate(&json!({ "paths": {} }));
        assert!(!report.is_valid);
        assert!(report.errors.iter().any(|e| e.rule == "structure.openapi"));
        assert!(report.errors.iter().any(|e| e.rule == "structure.info"));
    }

    #[test]
    fn duplicate_operation_id_is_error() {
        let mut doc = valid_auth_document();
        doc["paths"]["/auth/users"] = json!({
            "get": { "operationId": "authGetUser", "tags": ["Auth"], "responses": { "200": { "description": "OK" } } }
        });
        let report = DefaultOpenApiValidator::new().validate(&doc);
        assert!(report.errors.iter().any(|e| e.rule == "operationId.unique"));
    }

    #[test]
    fn unresolved_ref_is_error() {
        let mut doc = valid_auth_document();
        doc["paths"]["/auth/users/{userId}"]["get"]["responses"]["404"] =
            json!({ "$ref": "#/components/responses/Missing" });
        let report = DefaultOpenApiValidator::new().validate(&doc);
        assert!(report.errors.iter().any(|e| e.rule == "ref.unresolved"));
    }

    #[test]
    fn undefined_security_scheme_is_error() {
        let mut doc = valid_auth_document();
        doc["paths"]["/auth/users/{userId}"]["get"]["security"] = json!([{ "ghostAuth": [] }]);
        let report = DefaultOpenApiValidator::new().validate(&doc);
        assert!(report.errors.iter().any(|e| e.rule == "securityScheme.undefined"));
    }

    #[test]
    fn path_parameter_mismatch_is_error() {
        let mut doc = valid_auth_document();
        // parameters から userId を除去して path と不一致にする。
        doc["paths"]["/auth/users/{userId}"]["get"]["parameters"] = json!([]);
        let report = DefaultOpenApiValidator::new().validate(&doc);
        assert!(report.errors.iter().any(|e| e.rule == "pathParameter.mismatch"));
    }

    #[test]
    fn missing_success_response_is_error() {
        let mut doc = valid_auth_document();
        doc["paths"]["/auth/users/{userId}"]["get"]["responses"] =
            json!({ "500": { "description": "err" } });
        let report = DefaultOpenApiValidator::new().validate(&doc);
        assert!(report.errors.iter().any(|e| e.rule == "operation.responses"));
    }

    #[test]
    fn missing_tags_is_warning_not_error() {
        let mut doc = valid_auth_document();
        doc["paths"]["/auth/users/{userId}"]["get"]
            .as_object_mut()
            .unwrap()
            .remove("tags");
        let report = DefaultOpenApiValidator::new().validate(&doc);
        assert!(report.is_valid, "tags missing should not invalidate");
        assert!(report.warnings.iter().any(|w| w.rule == "operation.tags"));
    }
}
