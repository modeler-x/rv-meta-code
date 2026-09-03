use serde::Serialize;
use serde_json::Value;
use std::collections::{BTreeMap, HashMap};
use std::fs;
use std::path::{Path, PathBuf};

use crate::errors::app_error::AppError;

const MAX_DEPTH: usize = 12;
const MAX_SOURCE_BYTES: u64 = 2 * 1024 * 1024;
const MAX_MANIFEST_BYTES: u64 = 8 * 1024 * 1024;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowFrameStep {
    pub key: String,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub component_kind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub operation: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signal: Option<String>,
    pub branches: Vec<WorkflowFrameBranch>,
    pub steps: Vec<WorkflowFrameStep>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowFrameBranch {
    pub key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outcome: Option<String>,
    pub steps: Vec<WorkflowFrameStep>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowFrame {
    pub code: String,
    pub temporal_workflow_type: String,
    pub steps: Vec<WorkflowFrameStep>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerComponentCandidate {
    pub id: String,
    pub directory: String,
    pub component_code: Option<String>,
    pub manifest_path: Option<String>,
    pub source_paths: Vec<String>,
    pub manifest: Option<Value>,
    pub workflows: Vec<WorkflowFrame>,
}

#[derive(Default)]
struct Candidate {
    component_code: Option<String>,
    manifest_path: Option<PathBuf>,
    source_paths: Vec<PathBuf>,
    manifest: Option<Value>,
    workflows: Vec<WorkflowFrame>,
}

pub fn scan_worker_components(root: &str) -> Result<Vec<WorkerComponentCandidate>, AppError> {
    let root = require_directory(root)?;
    let mut files = Vec::new();
    collect_files(&root, &root, 0, &mut files)?;
    let mut candidates: BTreeMap<PathBuf, Candidate> = BTreeMap::new();

    for path in files {
        let metadata = fs::metadata(&path)
            .map_err(|e| AppError::io(&format!("read {} metadata: {e}", path.display())))?;
        let parent = path.parent().unwrap_or(&root).to_path_buf();
        if path.file_name().and_then(|name| name.to_str()) == Some("workflow_manifest.json") {
            if metadata.len() > MAX_MANIFEST_BYTES {
                continue;
            }
            let text = fs::read_to_string(&path)
                .map_err(|e| AppError::io(&format!("read {}: {e}", path.display())))?;
            let value: Value = serde_json::from_str(&text).map_err(|e| {
                AppError::validation(&format!("{} is not valid JSON: {e}", path.display()))
            })?;
            let candidate = candidates.entry(parent).or_default();
            candidate.component_code = value
                .get("component")
                .and_then(Value::as_str)
                .map(str::to_owned);
            candidate.manifest_path = Some(path);
            candidate.manifest = Some(value);
            continue;
        }
        if metadata.len() > MAX_SOURCE_BYTES || !is_source(&path) {
            continue;
        }
        let text = match fs::read_to_string(&path) {
            Ok(value) => value,
            Err(_) => continue,
        };
        let frames = parse_workflow_frames(&text)?;
        if !frames.is_empty() {
            let candidate = candidates.entry(parent).or_default();
            candidate.source_paths.push(path);
            candidate.workflows.extend(frames);
        }
    }

    Ok(candidates
        .into_iter()
        .filter_map(|(directory, mut candidate)| {
            if candidate.manifest.is_none() && candidate.workflows.is_empty() {
                return None;
            }
            candidate.source_paths.sort();
            candidate.workflows.sort_by(|a, b| a.code.cmp(&b.code));
            Some(WorkerComponentCandidate {
                id: directory.to_string_lossy().to_string(),
                directory: directory.to_string_lossy().to_string(),
                component_code: candidate.component_code,
                manifest_path: candidate
                    .manifest_path
                    .map(|path| path.to_string_lossy().to_string()),
                source_paths: candidate
                    .source_paths
                    .into_iter()
                    .map(|path| path.to_string_lossy().to_string())
                    .collect(),
                manifest: candidate.manifest,
                workflows: candidate.workflows,
            })
        })
        .collect())
}

pub fn save_manifest(path: &str, content: &str, backup: bool) -> Result<Option<String>, AppError> {
    let target = require_json_path(path)?;
    let _: Value = serde_json::from_str(content)
        .map_err(|e| AppError::validation(&format!("manifest is not valid JSON: {e}")))?;
    let parent = target
        .parent()
        .ok_or_else(|| AppError::validation("manifest path has no parent"))?;
    fs::create_dir_all(parent)
        .map_err(|e| AppError::io(&format!("create {}: {e}", parent.display())))?;
    let temporary = parent.join(format!(
        ".{}.tmp",
        target
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("workflow_manifest.json")
    ));
    fs::write(&temporary, format!("{}\n", content.trim_end()))
        .map_err(|e| AppError::io(&format!("write temporary manifest: {e}")))?;

    let mut backup_path = None;
    if backup && target.exists() {
        let path = next_backup_path(parent);
        fs::rename(&target, &path)
            .map_err(|e| AppError::io(&format!("backup {}: {e}", target.display())))?;
        backup_path = Some(path);
    }
    if let Err(error) = fs::rename(&temporary, &target) {
        if let Some(ref backup_file) = backup_path {
            let _ = fs::rename(backup_file, &target);
        }
        return Err(AppError::io(&format!("save {}: {error}", target.display())));
    }
    Ok(backup_path.map(|path| path.to_string_lossy().to_string()))
}

fn require_directory(root: &str) -> Result<PathBuf, AppError> {
    let value = root.trim();
    if value.is_empty() {
        return Err(AppError::validation("workspace directory is required"));
    }
    let path =
        fs::canonicalize(value).map_err(|e| AppError::io(&format!("open workspace: {e}")))?;
    if !path.is_dir() {
        return Err(AppError::validation("workspace must be a directory"));
    }
    Ok(path)
}

fn require_json_path(path: &str) -> Result<PathBuf, AppError> {
    let value = path.trim();
    if value.is_empty() {
        return Err(AppError::validation("manifest path is required"));
    }
    let path = PathBuf::from(value);
    if path.extension().and_then(|extension| extension.to_str()) != Some("json") {
        return Err(AppError::validation(
            "manifest file must use the .json extension",
        ));
    }
    Ok(path)
}

fn next_backup_path(parent: &Path) -> PathBuf {
    for index in 1.. {
        let candidate = parent.join(format!("workflow_manifest_bak ({index}).json"));
        if !candidate.exists() {
            return candidate;
        }
    }
    unreachable!()
}

fn collect_files(
    root: &Path,
    directory: &Path,
    depth: usize,
    result: &mut Vec<PathBuf>,
) -> Result<(), AppError> {
    if depth > MAX_DEPTH {
        return Ok(());
    }
    let entries = fs::read_dir(directory)
        .map_err(|e| AppError::io(&format!("scan {}: {e}", directory.display())))?;
    for entry in entries {
        let entry = entry.map_err(|e| AppError::io(&format!("scan {}: {e}", root.display())))?;
        let path = entry.path();
        let file_type = entry
            .file_type()
            .map_err(|e| AppError::io(&format!("read {} type: {e}", path.display())))?;
        if file_type.is_symlink() {
            continue;
        }
        if file_type.is_dir() {
            if !ignored_directory(&path) {
                collect_files(root, &path, depth + 1, result)?;
            }
        } else if file_type.is_file() {
            result.push(path);
        }
    }
    Ok(())
}

fn ignored_directory(path: &Path) -> bool {
    matches!(
        path.file_name().and_then(|name| name.to_str()),
        Some(".git" | "vendor" | "node_modules" | "target" | ".venv" | "dist" | "build")
    )
}

fn is_source(path: &Path) -> bool {
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default();
    if file_name.ends_with("_test.go")
        || file_name.ends_with(".test.ts")
        || file_name.ends_with(".test.js")
        || file_name.ends_with("_test.rs")
    {
        return false;
    }
    matches!(
        path.extension().and_then(|extension| extension.to_str()),
        Some("go" | "rs" | "py" | "ts" | "js" | "java" | "kt")
    )
}

fn parse_workflow_frames(source: &str) -> Result<Vec<WorkflowFrame>, AppError> {
    let mut workflows = Vec::new();
    let mut current: Option<WorkflowFrame> = None;
    for (index, line) in source.lines().enumerate() {
        let directive = normalize_directive(line);
        if !directive.starts_with("rv:") {
            continue;
        }
        let mut parts = directive.split_whitespace();
        let command = parts.next().unwrap_or_default();
        let attributes = attributes(parts, index + 1)?;
        match command {
            "rv:workflow-frame" => {
                if let Some(workflow) = current.take() {
                    workflows.push(workflow);
                }
                current = Some(WorkflowFrame {
                    code: required_attribute(&attributes, "code", index + 1)?,
                    temporal_workflow_type: required_attribute(&attributes, "type", index + 1)?,
                    steps: Vec::new(),
                });
            }
            "rv:end-workflow-frame" => {
                if let Some(workflow) = current.take() {
                    workflows.push(workflow);
                }
            }
            "rv:step" => {
                let workflow = current.as_mut().ok_or_else(|| {
                    AppError::validation(&format!(
                        "line {} has a step outside a Workflow",
                        index + 1
                    ))
                })?;
                let step = WorkflowFrameStep {
                    key: required_attribute(&attributes, "key", index + 1)?,
                    kind: required_attribute(&attributes, "kind", index + 1)?,
                    component_kind: attributes.get("component").cloned(),
                    operation: attributes.get("operation").cloned(),
                    signal: attributes.get("signal").cloned(),
                    branches: Vec::new(),
                    steps: Vec::new(),
                };
                append_step(workflow, attributes.get("parent"), step)?;
            }
            "rv:branch" => {
                let workflow = current.as_mut().ok_or_else(|| {
                    AppError::validation(&format!(
                        "line {} has a branch outside a Workflow",
                        index + 1
                    ))
                })?;
                let parent = required_attribute(&attributes, "parent", index + 1)?;
                let step = find_step_mut(&mut workflow.steps, &parent).ok_or_else(|| {
                    AppError::validation(&format!("branch parent {parent} is not declared"))
                })?;
                step.branches.push(WorkflowFrameBranch {
                    key: required_attribute(&attributes, "key", index + 1)?,
                    outcome: attributes.get("outcome").cloned(),
                    steps: Vec::new(),
                });
            }
            _ => {}
        }
    }
    if let Some(workflow) = current {
        workflows.push(workflow);
    }
    Ok(workflows)
}

fn normalize_directive(line: &str) -> &str {
    line.trim()
        .trim_start_matches("//")
        .trim_start_matches('#')
        .trim_start_matches("/*")
        .trim_end_matches("*/")
        .trim()
}

fn attributes<'a>(
    parts: impl Iterator<Item = &'a str>,
    line: usize,
) -> Result<HashMap<String, String>, AppError> {
    let mut result = HashMap::new();
    for part in parts {
        let (key, value) = part.split_once('=').ok_or_else(|| {
            AppError::validation(&format!(
                "invalid Workflow frame attribute {part} on line {line}"
            ))
        })?;
        result.insert(key.to_string(), value.to_string());
    }
    Ok(result)
}

fn required_attribute(
    attributes: &HashMap<String, String>,
    key: &str,
    line: usize,
) -> Result<String, AppError> {
    attributes
        .get(key)
        .filter(|value| !value.is_empty())
        .cloned()
        .ok_or_else(|| AppError::validation(&format!("Workflow frame line {line} requires {key}")))
}

fn append_step(
    workflow: &mut WorkflowFrame,
    parent: Option<&String>,
    step: WorkflowFrameStep,
) -> Result<(), AppError> {
    let Some(parent) = parent else {
        workflow.steps.push(step);
        return Ok(());
    };
    let (step_key, branch_key) = parent.split_once('/').ok_or_else(|| {
        AppError::validation(&format!("step parent {parent} must be step/branch"))
    })?;
    let parent_step = find_step_mut(&mut workflow.steps, step_key)
        .ok_or_else(|| AppError::validation(&format!("step parent {step_key} is not declared")))?;
    let branch = parent_step
        .branches
        .iter_mut()
        .find(|branch| branch.key == branch_key)
        .ok_or_else(|| {
            AppError::validation(&format!("step parent branch {parent} is not declared"))
        })?;
    branch.steps.push(step);
    Ok(())
}

fn find_step_mut<'a>(
    steps: &'a mut [WorkflowFrameStep],
    key: &str,
) -> Option<&'a mut WorkflowFrameStep> {
    for step in steps {
        if step.key == key {
            return Some(step);
        }
        for branch in &mut step.branches {
            if let Some(found) = find_step_mut(&mut branch.steps, key) {
                return Some(found);
            }
        }
        if let Some(found) = find_step_mut(&mut step.steps, key) {
            return Some(found);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_workflow_structure_without_human_copy() {
        let frames = parse_workflow_frames("// rv:workflow-frame code=sample type=SampleWorkflow\n// rv:step key=plan kind=operation component=engine_operation operation=plan\n// rv:end-workflow-frame").unwrap();
        assert_eq!(frames[0].code, "sample");
        assert_eq!(frames[0].steps[0].operation.as_deref(), Some("plan"));
    }

    #[test]
    fn normal_save_keeps_numbered_backup() {
        let directory =
            std::env::temp_dir().join(format!("rv-meta-code-manifest-{}", std::process::id()));
        fs::create_dir_all(&directory).unwrap();
        let target = directory.join("workflow_manifest.json");
        fs::write(&target, "{\"component\":\"before\"}").unwrap();
        let backup = save_manifest(target.to_str().unwrap(), "{\"component\":\"after\"}", true)
            .unwrap()
            .unwrap();
        assert!(backup.ends_with("workflow_manifest_bak (1).json"));
        assert!(fs::read_to_string(backup).unwrap().contains("before"));
        assert!(fs::read_to_string(target).unwrap().contains("after"));
        let _ = fs::remove_dir_all(directory);
    }

    #[test]
    fn scan_groups_source_frame_with_manifest_and_skips_test_sources() {
        let directory =
            std::env::temp_dir().join(format!("rv-meta-code-scan-{}", std::process::id()));
        let _ = fs::remove_dir_all(&directory);
        fs::create_dir_all(&directory).unwrap();
        fs::write(
            directory.join("workflow_manifest.json"),
            r#"{"component":"sample","workflows":[]}"#,
        )
        .unwrap();
        fs::write(
            directory.join("workflows.go"),
            "// rv:workflow-frame code=sample type=SampleWorkflow\n// rv:step key=run kind=operation component=engine_operation operation=run\n// rv:end-workflow-frame",
        )
        .unwrap();
        fs::write(
            directory.join("workflows_test.go"),
            "// rv:workflow-frame code=fixture type=FixtureWorkflow\n// rv:end-workflow-frame",
        )
        .unwrap();

        let candidates = scan_worker_components(directory.to_str().unwrap()).unwrap();
        assert_eq!(candidates.len(), 1);
        assert_eq!(candidates[0].component_code.as_deref(), Some("sample"));
        assert_eq!(candidates[0].workflows.len(), 1);
        assert_eq!(candidates[0].workflows[0].code, "sample");
        let _ = fs::remove_dir_all(directory);
    }
}
