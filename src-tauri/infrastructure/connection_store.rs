use std::fs;
use std::path::{Path, PathBuf};

use crate::domain::connection::Connection;
use crate::errors::app_error::AppError;
use crate::infrastructure::crypto;

/// 接続一覧をアプリのデータディレクトリに暗号化して永続化するストア。
pub struct ConnectionStore {
    file_path: PathBuf,
}

impl ConnectionStore {
    pub fn new(app_data_dir: &Path) -> Self {
        Self {
            file_path: app_data_dir.join("connections.enc"),
        }
    }

    pub fn load(&self) -> Result<Vec<Connection>, AppError> {
        if !self.file_path.exists() {
            return Ok(Vec::new());
        }
        let blob = fs::read(&self.file_path)
            .map_err(|error| AppError::io(&format!("failed to read store: {error}")))?;
        if blob.is_empty() {
            return Ok(Vec::new());
        }
        let plaintext = crypto::decrypt(&blob)?;
        serde_json::from_slice(&plaintext)
            .map_err(|error| AppError::io(&format!("failed to parse store: {error}")))
    }

    pub fn save_all(&self, connections: &[Connection]) -> Result<(), AppError> {
        if let Some(parent) = self.file_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| AppError::io(&format!("failed to create data dir: {error}")))?;
        }
        let plaintext = serde_json::to_vec(connections)
            .map_err(|error| AppError::io(&format!("failed to serialize store: {error}")))?;
        let blob = crypto::encrypt(&plaintext)?;
        fs::write(&self.file_path, blob)
            .map_err(|error| AppError::io(&format!("failed to write store: {error}")))
    }
}
