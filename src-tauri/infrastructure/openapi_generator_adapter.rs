use std::collections::BTreeMap;
use std::path::{Component, Path, PathBuf};
use std::time::{Duration, Instant};

use crate::application::sdk_generator::SdkGenerator;
use crate::dto::sdk_dto::{GenerateSdkRequest, GenerateSdkResult, GeneratorCapabilities};
use crate::errors::app_error::AppError;

/// 外部 Process の実行結果。Generator 未導入 / timeout / 通常終了を区別する。
#[derive(Debug, Clone)]
pub enum RunOutcome {
    NotFound,
    TimedOut,
    Completed { code: i32, stdout: String, stderr: String },
}

/// Process 実行の抽象（テストで差し替え可能にし、CLI 未導入でも検証できるようにする）。
/// shell 文字列を組み立てず、program と引数配列を渡す。
pub trait CommandRunner {
    fn run(&self, program: &str, args: &[String], timeout: Duration) -> RunOutcome;
}

/// std::process による実 Process 実行。stdout/stderr をスレッドで読み、timeout で kill する。
pub struct SystemCommandRunner;

impl CommandRunner for SystemCommandRunner {
    fn run(&self, program: &str, args: &[String], timeout: Duration) -> RunOutcome {
        use std::io::Read;
        use std::process::{Command, Stdio};

        let mut child = match Command::new(program)
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
        {
            Ok(child) => child,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return RunOutcome::NotFound,
            Err(error) => {
                return RunOutcome::Completed {
                    code: -1,
                    stdout: String::new(),
                    stderr: format!("spawn failed: {error}"),
                }
            }
        };

        let mut stdout_pipe = child.stdout.take();
        let mut stderr_pipe = child.stderr.take();
        let out_handle = std::thread::spawn(move || {
            let mut buffer = String::new();
            if let Some(pipe) = stdout_pipe.as_mut() {
                let _ = pipe.read_to_string(&mut buffer);
            }
            buffer
        });
        let err_handle = std::thread::spawn(move || {
            let mut buffer = String::new();
            if let Some(pipe) = stderr_pipe.as_mut() {
                let _ = pipe.read_to_string(&mut buffer);
            }
            buffer
        });

        let start = Instant::now();
        loop {
            match child.try_wait() {
                Ok(Some(status)) => {
                    let stdout = out_handle.join().unwrap_or_default();
                    let stderr = err_handle.join().unwrap_or_default();
                    return RunOutcome::Completed {
                        code: status.code().unwrap_or(-1),
                        stdout,
                        stderr,
                    };
                }
                Ok(None) => {
                    if start.elapsed() >= timeout {
                        let _ = child.kill();
                        let _ = child.wait();
                        let _ = out_handle.join();
                        let _ = err_handle.join();
                        return RunOutcome::TimedOut;
                    }
                    std::thread::sleep(Duration::from_millis(50));
                }
                Err(error) => {
                    return RunOutcome::Completed {
                        code: -1,
                        stdout: String::new(),
                        stderr: format!("wait failed: {error}"),
                    }
                }
            }
        }
    }
}

/// OpenAPI Generator CLI を呼び出す Infrastructure Adapter。
/// CLI 名・引数・Process 起動・version 検出をここに閉じ込め、Application/UI から直接呼ばせない。
pub struct OpenApiGeneratorCliAdapter<R: CommandRunner> {
    runner: R,
    program: String,
    allowed_root: Option<PathBuf>,
    timeout: Duration,
    version_timeout: Duration,
    min_major: u64,
    generator_id: String,
}

impl<R: CommandRunner> OpenApiGeneratorCliAdapter<R> {
    pub fn new(runner: R, program: impl Into<String>, allowed_root: Option<PathBuf>) -> Self {
        Self {
            runner,
            program: program.into(),
            allowed_root,
            timeout: Duration::from_secs(120),
            version_timeout: Duration::from_secs(15),
            min_major: 6,
            generator_id: "openapi-generator-cli".to_string(),
        }
    }

    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    fn require_supported_version(&self) -> Result<(), AppError> {
        let caps = self.capabilities()?;
        if !caps.is_available {
            return Err(AppError::generator_not_available(&format!(
                "{} is not available",
                self.program
            )));
        }
        match caps.version.as_deref().and_then(parse_version) {
            Some((major, _, _)) if major >= self.min_major => Ok(()),
            Some(_) => Err(AppError::generator_version_unsupported(&format!(
                "{} version {} is unsupported (need major >= {})",
                self.program,
                caps.version.unwrap_or_default(),
                self.min_major
            ))),
            None => Err(AppError::generator_version_unsupported(
                "could not determine generator version",
            )),
        }
    }
}

impl<R: CommandRunner> SdkGenerator for OpenApiGeneratorCliAdapter<R> {
    fn capabilities(&self) -> Result<GeneratorCapabilities, AppError> {
        match self.runner.run(&self.program, &["version".to_string()], self.version_timeout) {
            RunOutcome::NotFound => Ok(GeneratorCapabilities {
                generator_id: self.generator_id.clone(),
                is_available: false,
                version: None,
            }),
            RunOutcome::TimedOut => Err(AppError::generator_not_available("version check timed out")),
            RunOutcome::Completed { code, stdout, .. } => Ok(GeneratorCapabilities {
                generator_id: self.generator_id.clone(),
                is_available: code == 0,
                version: parse_version(&stdout).map(|(a, b, c)| format!("{a}.{b}.{c}")),
            }),
        }
    }

    fn generate(&self, request: &GenerateSdkRequest) -> Result<GenerateSdkResult, AppError> {
        // 1. 出力先の境界検証（正規化・.. 拒否・allowed_root 内）。
        let output = resolve_output_dir(self.allowed_root.as_deref(), &request.output_directory)?;

        // 2. Generator の存在・version（NOT_AVAILABLE / VERSION_UNSUPPORTED を区別）。
        self.require_supported_version()?;

        // 3. 出力先の親を用意し、同一 FS 上に staging を作る。
        //    Generator は staging へ生成し、成功時のみ output へ move する。
        //    途中失敗（timeout / 非0終了）では staging を破棄し、output に部分生成物を残さない。
        if let Some(parent) = output.parent() {
            std::fs::create_dir_all(parent).map_err(|error| {
                AppError::sdk_output_invalid(&format!("cannot create output directory: {error}"))
            })?;
        }
        let staging = StagingDir::create(&output)
            .map_err(|error| AppError::sdk_generation_failed(&format!("cannot create staging dir: {error}")))?;

        // 4. OpenAPI JSON を管理された一時ファイルへ書き出す（Drop で必ず削除）。
        let spec_json = serde_json::to_string(&request.openapi_document)
            .map_err(|error| AppError::sdk_generation_failed(&format!("serialize openapi failed: {error}")))?;
        let temp = TempSpecFile::create(&spec_json)
            .map_err(|error| AppError::sdk_generation_failed(&format!("cannot write temp spec: {error}")))?;
        let spec_path = temp.path().to_string_lossy().to_string();

        // 5. staging を出力先に指定して実行し、結果を分類する。
        let args = build_generate_args(request, &spec_path, &staging.path().to_string_lossy());
        let start = Instant::now();
        let outcome = self.runner.run(&self.program, &args, self.timeout);
        let duration_ms = start.elapsed().as_millis() as u64;

        match outcome {
            // staging は Drop で破棄される（output は未作成のまま）。
            RunOutcome::NotFound => Err(AppError::generator_not_available(&format!("{} not found", self.program))),
            RunOutcome::TimedOut => Err(AppError::sdk_generation_timeout(&format!(
                "generation exceeded {} ms",
                self.timeout.as_millis()
            ))),
            RunOutcome::Completed { code: 0, stdout, .. } => {
                // 6. 成功時のみ output へ昇格（同一 FS なら rename で atomic）。
                let generated_files = list_generated_files(staging.path());
                staging.promote(&output).map_err(|error| {
                    AppError::sdk_generation_failed(&format!("cannot move generated files to output: {error}"))
                })?;
                Ok(GenerateSdkResult {
                    generator_id: self.generator_id.clone(),
                    output_directory: output.to_string_lossy().to_string(),
                    generated_files,
                    warnings: collect_warnings(&stdout),
                    duration_ms,
                })
            }
            RunOutcome::Completed { code, stderr, .. } => Err(AppError::sdk_generation_failed(&format!(
                "generator exited with code {code}: {}",
                summarize(&stderr)
            ))),
        }
    }
}

/// openapi-generator-cli の generate 引数配列を作る。
/// package は TypeScript 系の慣例で npmName/npmVersion へ対応づける（明示指定があれば優先）。
fn build_generate_args(request: &GenerateSdkRequest, spec_path: &str, output_dir: &str) -> Vec<String> {
    let mut props: BTreeMap<String, String> = request.additional_properties.clone();
    props.entry("npmName".to_string()).or_insert_with(|| request.package_name.clone());
    if let Some(version) = &request.package_version {
        props.entry("npmVersion".to_string()).or_insert_with(|| version.clone());
    }
    let props_str = props
        .iter()
        .map(|(key, value)| format!("{key}={value}"))
        .collect::<Vec<_>>()
        .join(",");

    // 二段階検証。生成前に自前の RV Policy Validator（operationId/x-rv-operation-group/
    // prefix 等の RV 固有規則）を通し、ここでは OpenAPI Generator 自身の標準 spec 検証を
    // 有効にする（--skip-validate-spec を付けない）。非標準の x- 拡張は OpenAPI 上も
    // 正当なため Generator の検証を妨げない。
    let mut args = vec![
        "generate".to_string(),
        "-i".to_string(),
        spec_path.to_string(),
        "-g".to_string(),
        request.language.clone(),
        "-o".to_string(),
        output_dir.to_string(),
    ];
    if !props_str.is_empty() {
        args.push("--additional-properties".to_string());
        args.push(props_str);
    }
    args
}

/// 出力先を検証する。絶対パスで `..` を含まず、allowed_root 指定時はその内側であること。
fn resolve_output_dir(allowed_root: Option<&Path>, output: &str) -> Result<PathBuf, AppError> {
    let path = Path::new(output);
    if !path.is_absolute() {
        return Err(AppError::sdk_output_invalid("output directory must be an absolute path"));
    }
    if path.components().any(|c| matches!(c, Component::ParentDir)) {
        return Err(AppError::sdk_output_invalid("output directory must not contain '..'"));
    }
    if let Some(root) = allowed_root {
        if !path.starts_with(root) {
            return Err(AppError::sdk_output_invalid(
                "output directory is outside the allowed root",
            ));
        }
    }
    Ok(path.to_path_buf())
}

/// `major.minor.patch` を抽出する。patch の後ろのサフィックス（-SNAPSHOT 等）は無視する。
fn parse_version(text: &str) -> Option<(u64, u64, u64)> {
    for token in text.split(|c: char| c.is_whitespace()) {
        let parts: Vec<&str> = token.split('.').collect();
        if parts.len() >= 3 {
            let patch: String = parts[2].chars().take_while(|c| c.is_ascii_digit()).collect();
            if let (Ok(major), Ok(minor), Ok(patch)) =
                (parts[0].parse::<u64>(), parts[1].parse::<u64>(), patch.parse::<u64>())
            {
                return Some((major, minor, patch));
            }
        }
    }
    None
}

/// 生成されたファイルだけを列挙する（出力先に元からある無関係ファイルを含めない）。
/// openapi-generator は生成物一覧を .openapi-generator/FILES へ出力するので、それを使う。
/// マニフェストが無い場合のみ、フォールバックとして再帰走査する。
fn list_generated_files(root: &Path) -> Vec<String> {
    let manifest = root.join(".openapi-generator").join("FILES");
    if let Ok(content) = std::fs::read_to_string(&manifest) {
        let mut files: Vec<String> = content
            .lines()
            .map(|line| line.trim())
            .filter(|line| !line.is_empty())
            .map(|line| line.to_string())
            .collect();
        files.sort();
        return files;
    }
    let mut files = Vec::new();
    collect_files(root, root, &mut files);
    files.sort();
    files
}

fn collect_files(root: &Path, dir: &Path, out: &mut Vec<String>) {
    let Ok(entries) = std::fs::read_dir(dir) else { return };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_files(root, &path, out);
        } else if let Ok(rel) = path.strip_prefix(root) {
            out.push(rel.to_string_lossy().to_string());
        }
    }
}

fn collect_warnings(stdout: &str) -> Vec<String> {
    stdout
        .lines()
        .filter(|line| line.to_lowercase().contains("warning"))
        .take(50)
        .map(|line| line.trim().to_string())
        .collect()
}

/// stderr を UI 向けに要約する（全文ではなく末尾の要点を短く）。Credential 等は出さない。
fn summarize(stderr: &str) -> String {
    let trimmed = stderr.trim();
    const MAX: usize = 500;
    if trimmed.len() <= MAX {
        trimmed.to_string()
    } else {
        format!("…{}", &trimmed[trimmed.len() - MAX..])
    }
}

/// 生成 staging ディレクトリ。出力先の兄弟として同一 FS 上に作り、成功時のみ output へ
/// 昇格する。promote されなければ Drop で破棄され、部分生成物を output に残さない。
struct StagingDir {
    path: PathBuf,
    keep: bool,
}

impl StagingDir {
    fn create(final_target: &Path) -> std::io::Result<Self> {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let base = final_target
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "sdk".to_string());
        let name = format!(".{base}.rv-staging-{}-{}", std::process::id(), nanos);
        let path = final_target
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .join(name);
        std::fs::create_dir_all(&path)?;
        Ok(Self { path, keep: false })
    }

    fn path(&self) -> &Path {
        &self.path
    }

    /// staging を output へ移す。output 未存在なら rename（同一 FS で atomic）、
    /// 既存ならファイル単位で merge move する。
    fn promote(mut self, output: &Path) -> std::io::Result<()> {
        if output.exists() {
            move_tree(&self.path, output)?;
            std::fs::remove_dir_all(&self.path)?;
        } else {
            std::fs::rename(&self.path, output)?;
        }
        self.keep = true;
        Ok(())
    }
}

impl Drop for StagingDir {
    fn drop(&mut self) {
        if !self.keep {
            let _ = std::fs::remove_dir_all(&self.path);
        }
    }
}

/// from 配下を to へ再帰的に move（既存ファイルは上書き）。同一 FS なら rename、
/// 異なる FS では copy+remove にフォールバックする。
fn move_tree(from: &Path, to: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(to)?;
    for entry in std::fs::read_dir(from)? {
        let entry = entry?;
        let src = entry.path();
        let dst = to.join(entry.file_name());
        if src.is_dir() {
            move_tree(&src, &dst)?;
        } else {
            if let Some(parent) = dst.parent() {
                std::fs::create_dir_all(parent)?;
            }
            if dst.exists() {
                std::fs::remove_file(&dst)?;
            }
            if std::fs::rename(&src, &dst).is_err() {
                std::fs::copy(&src, &dst)?;
                std::fs::remove_file(&src)?;
            }
        }
    }
    Ok(())
}

/// 一時 OpenAPI ファイル。Drop で必ず削除する。
struct TempSpecFile {
    path: PathBuf,
}

impl TempSpecFile {
    fn create(content: &str) -> std::io::Result<Self> {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let path = std::env::temp_dir().join(format!("rv-openapi-{}-{}.json", std::process::id(), nanos));
        std::fs::write(&path, content)?;
        Ok(Self { path })
    }

    fn path(&self) -> &Path {
        &self.path
    }
}

impl Drop for TempSpecFile {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.path);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    struct FakeRunner {
        version: RunOutcome,
        generate: RunOutcome,
    }

    impl CommandRunner for FakeRunner {
        fn run(&self, _program: &str, args: &[String], _timeout: Duration) -> RunOutcome {
            if args.first().map(String::as_str) == Some("version") {
                self.version.clone()
            } else {
                self.generate.clone()
            }
        }
    }

    fn version_ok() -> RunOutcome {
        RunOutcome::Completed { code: 0, stdout: "7.0.1".into(), stderr: String::new() }
    }

    fn unique_temp_dir(tag: &str) -> PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("rvsdk-{tag}-{nanos}"))
    }

    fn request(output_directory: &str) -> GenerateSdkRequest {
        GenerateSdkRequest {
            generator_id: "openapi-generator-cli".into(),
            schema_name: "rv_auth".into(),
            openapi_document: json!({ "openapi": "3.0.3", "info": { "title": "t", "version": "1" }, "paths": {} }),
            language: "typescript-fetch".into(),
            package_name: "rv-sdk".into(),
            package_version: Some("1.2.3".into()),
            output_directory: output_directory.into(),
            additional_properties: BTreeMap::new(),
        }
    }

    #[test]
    fn build_args_uses_argument_array_with_generator_and_npm_name() {
        let args = build_generate_args(&request("/tmp/out"), "/tmp/spec.json", "/tmp/out");
        assert_eq!(args[0], "generate");
        assert_eq!(args[1], "-i");
        assert_eq!(args[2], "/tmp/spec.json");
        assert_eq!(args[3], "-g");
        assert_eq!(args[4], "typescript-fetch");
        assert_eq!(args[5], "-o");
        assert_eq!(args[6], "/tmp/out");
        // Generator 標準検証を委譲するため --skip-validate-spec は付けない。
        assert!(!args.contains(&"--skip-validate-spec".to_string()));
        let props_index = args.iter().position(|a| a == "--additional-properties").unwrap();
        assert!(args[props_index + 1].contains("npmName=rv-sdk"));
        assert!(args[props_index + 1].contains("npmVersion=1.2.3"));
    }

    #[test]
    fn output_dir_boundary_rejects_relative_traversal_and_outside_root() {
        let root = Path::new("/allowed/root");
        assert!(resolve_output_dir(Some(root), "relative/dir").is_err());
        assert!(resolve_output_dir(Some(root), "/allowed/root/../escape").is_err());
        assert!(resolve_output_dir(Some(root), "/other/place").is_err());
        assert!(resolve_output_dir(Some(root), "/allowed/root/sdk").is_ok());
    }

    #[test]
    fn parse_version_extracts_semver() {
        assert_eq!(parse_version("7.0.1"), Some((7, 0, 1)));
        assert_eq!(parse_version("openapi-generator-cli 6.6.0\n"), Some((6, 6, 0)));
        assert_eq!(parse_version("5.4.0-SNAPSHOT"), Some((5, 4, 0)));
        assert_eq!(parse_version("no version here"), None);
    }

    fn adapter(runner: FakeRunner, allowed_root: PathBuf) -> OpenApiGeneratorCliAdapter<FakeRunner> {
        OpenApiGeneratorCliAdapter::new(runner, "openapi-generator-cli", Some(allowed_root))
    }

    #[test]
    fn capabilities_reports_unavailable_when_cli_missing() {
        let a = adapter(
            FakeRunner { version: RunOutcome::NotFound, generate: RunOutcome::NotFound },
            std::env::temp_dir(),
        );
        let caps = a.capabilities().unwrap();
        assert!(!caps.is_available);
        assert_eq!(caps.version, None);
    }

    #[test]
    fn generate_returns_not_available_when_cli_missing() {
        let root = std::env::temp_dir();
        let out = root.join("rvsdk-na");
        let a = adapter(
            FakeRunner { version: RunOutcome::NotFound, generate: RunOutcome::NotFound },
            root,
        );
        let err = a.generate(&request(&out.to_string_lossy())).unwrap_err();
        assert_eq!(err.code, "GENERATOR_NOT_AVAILABLE");
    }

    #[test]
    fn generate_returns_version_unsupported_for_old_version() {
        let root = std::env::temp_dir();
        let out = root.join("rvsdk-old");
        let a = adapter(
            FakeRunner {
                version: RunOutcome::Completed { code: 0, stdout: "3.0.0".into(), stderr: String::new() },
                generate: version_ok(),
            },
            root,
        );
        let err = a.generate(&request(&out.to_string_lossy())).unwrap_err();
        assert_eq!(err.code, "GENERATOR_VERSION_UNSUPPORTED");
    }

    #[test]
    fn generate_rejects_output_outside_allowed_root() {
        let a = adapter(
            FakeRunner { version: version_ok(), generate: version_ok() },
            PathBuf::from("/allowed/root"),
        );
        let err = a.generate(&request("/other/place")).unwrap_err();
        assert_eq!(err.code, "SDK_OUTPUT_INVALID");
    }

    #[test]
    fn generate_maps_nonzero_exit_to_generation_failed() {
        let root = unique_temp_dir("fail");
        let out = root.join("sdk");
        let a = adapter(
            FakeRunner {
                version: version_ok(),
                generate: RunOutcome::Completed { code: 1, stdout: String::new(), stderr: "boom".into() },
            },
            root.clone(),
        );
        let err = a.generate(&request(&out.to_string_lossy())).unwrap_err();
        assert_eq!(err.code, "SDK_GENERATION_FAILED");
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn generate_maps_timeout_to_generation_timeout() {
        let root = unique_temp_dir("timeout");
        let out = root.join("sdk");
        let a = adapter(
            FakeRunner { version: version_ok(), generate: RunOutcome::TimedOut },
            root.clone(),
        );
        let err = a.generate(&request(&out.to_string_lossy())).unwrap_err();
        assert_eq!(err.code, "SDK_GENERATION_TIMEOUT");
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn generate_succeeds_on_zero_exit() {
        let root = unique_temp_dir("ok");
        let out = root.join("sdk");
        let a = adapter(
            FakeRunner {
                version: version_ok(),
                generate: RunOutcome::Completed { code: 0, stdout: "done".into(), stderr: String::new() },
            },
            root.clone(),
        );
        let result = a.generate(&request(&out.to_string_lossy())).unwrap();
        assert_eq!(result.generator_id, "openapi-generator-cli");
        assert_eq!(result.output_directory, out.to_string_lossy());
        let _ = std::fs::remove_dir_all(&root);
    }

    /// 生成成功時に `-o`（staging）へファイルを書く runner。promote 検証用。
    struct WritingRunner;
    impl CommandRunner for WritingRunner {
        fn run(&self, _program: &str, args: &[String], _timeout: Duration) -> RunOutcome {
            if args.first().map(String::as_str) == Some("version") {
                return version_ok();
            }
            if let Some(i) = args.iter().position(|a| a == "-o") {
                let dir = PathBuf::from(&args[i + 1]);
                let _ = std::fs::create_dir_all(dir.join("src"));
                let _ = std::fs::write(dir.join("src").join("index.ts"), "export {}");
            }
            RunOutcome::Completed { code: 0, stdout: "done".into(), stderr: String::new() }
        }
    }

    #[test]
    fn generate_promotes_staged_files_into_output() {
        let root = unique_temp_dir("promote");
        let out = root.join("sdk");
        let a = OpenApiGeneratorCliAdapter::new(WritingRunner, "openapi-generator-cli", Some(root.clone()));
        let result = a.generate(&request(&out.to_string_lossy())).unwrap();
        // staging から output へ移動されている。
        assert!(out.join("src").join("index.ts").exists());
        assert!(result.generated_files.iter().any(|f| f == "src/index.ts"));
        // staging（.sdk.rv-staging-*）が残っていない。
        let leftover: Vec<_> = std::fs::read_dir(&root)
            .unwrap()
            .flatten()
            .filter(|e| e.file_name().to_string_lossy().contains("rv-staging"))
            .collect();
        assert!(leftover.is_empty(), "staging dir must not remain");
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn generate_failure_leaves_no_output_or_staging() {
        let root = unique_temp_dir("nopartial");
        let out = root.join("sdk");
        let a = adapter(
            FakeRunner {
                version: version_ok(),
                generate: RunOutcome::Completed { code: 1, stdout: String::new(), stderr: "boom".into() },
            },
            root.clone(),
        );
        let err = a.generate(&request(&out.to_string_lossy())).unwrap_err();
        assert_eq!(err.code, "SDK_GENERATION_FAILED");
        // 失敗時に output も staging も残さない。
        assert!(!out.exists(), "output must not be created on failure");
        let leftover: Vec<_> = std::fs::read_dir(&root)
            .map(|it| it.flatten().filter(|e| e.file_name().to_string_lossy().contains("rv-staging")).collect())
            .unwrap_or_default();
        assert!(leftover.is_empty(), "staging dir must not remain on failure");
        let _ = std::fs::remove_dir_all(&root);
    }
}
