use serde::Serialize;

/// OpenAPI 検証の1件（エラーまたは警告）。
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ValidationIssue {
    /// 問題箇所の JSON Pointer（例: /paths/~1auth~1users/get）。
    pub pointer: String,
    /// 違反した規則の識別子（例: operationId.unique）。
    pub rule: String,
    pub message: String,
}

impl ValidationIssue {
    pub fn new(pointer: &str, rule: &str, message: impl Into<String>) -> Self {
        Self {
            pointer: pointer.to_string(),
            rule: rule.to_string(),
            message: message.into(),
        }
    }
}

/// OpenAPI 検証レポート。エラーが1件以上なら is_valid=false（SDK 生成を開始しない）。
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ValidationReport {
    pub is_valid: bool,
    pub errors: Vec<ValidationIssue>,
    pub warnings: Vec<ValidationIssue>,
}

impl ValidationReport {
    pub fn new(errors: Vec<ValidationIssue>, warnings: Vec<ValidationIssue>) -> Self {
        Self {
            is_valid: errors.is_empty(),
            errors,
            warnings,
        }
    }
}
