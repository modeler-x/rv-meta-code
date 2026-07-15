use std::fs;
use std::path::{Path, PathBuf};

use crate::dto::sdk_profile_dto::SdkGenerationProfileDto;
use crate::errors::app_error::AppError;

/// SDK Generation Profile をアプリのデータディレクトリへ平文 JSON で永続化するストア。
/// 機密を含まないため暗号化しない（接続情報とは別ファイル）。
pub struct ProfileStore {
    file_path: PathBuf,
}

impl ProfileStore {
    pub fn new(app_data_dir: &Path) -> Self {
        Self {
            file_path: app_data_dir.join("sdk_profiles.json"),
        }
    }

    pub fn load(&self) -> Result<Vec<SdkGenerationProfileDto>, AppError> {
        if !self.file_path.exists() {
            return Ok(Vec::new());
        }
        let bytes = fs::read(&self.file_path)
            .map_err(|error| AppError::io(&format!("failed to read profiles: {error}")))?;
        if bytes.is_empty() {
            return Ok(Vec::new());
        }
        serde_json::from_slice(&bytes)
            .map_err(|error| AppError::io(&format!("failed to parse profiles: {error}")))
    }

    pub fn save_all(&self, profiles: &[SdkGenerationProfileDto]) -> Result<(), AppError> {
        if let Some(parent) = self.file_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| AppError::io(&format!("failed to create data dir: {error}")))?;
        }
        let bytes = serde_json::to_vec_pretty(profiles)
            .map_err(|error| AppError::io(&format!("failed to serialize profiles: {error}")))?;
        fs::write(&self.file_path, bytes)
            .map_err(|error| AppError::io(&format!("failed to write profiles: {error}")))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn profile(name: &str, schema: Option<&str>) -> SdkGenerationProfileDto {
        SdkGenerationProfileDto {
            name: name.to_string(),
            schema_name: schema.map(|s| s.to_string()),
            generator_id: "openapi-generator-cli".to_string(),
            generator_name: "typescript-fetch".to_string(),
            package_name: "rv-sdk".to_string(),
            package_version: Some("1.0.0".to_string()),
            output_directory: "/tmp/out".to_string(),
        }
    }

    fn temp_dir(tag: &str) -> PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("rvprofile-{tag}-{nanos}"))
    }

    #[test]
    fn load_returns_empty_when_absent() {
        let dir = temp_dir("absent");
        let store = ProfileStore::new(&dir);
        assert!(store.load().unwrap().is_empty());
    }

    #[test]
    fn save_and_load_round_trip() {
        let dir = temp_dir("roundtrip");
        let store = ProfileStore::new(&dir);
        let profiles = vec![profile("A", Some("rv_auth")), profile("B", None)];
        store.save_all(&profiles).unwrap();
        assert_eq!(store.load().unwrap(), profiles);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
