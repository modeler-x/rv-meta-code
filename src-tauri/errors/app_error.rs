use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct AppError {
    pub code: String,
    pub message: String,
}

impl AppError {
    fn new(code: &str, message: &str) -> Self {
        Self {
            code: code.to_string(),
            message: message.to_string(),
        }
    }

    pub fn validation(message: &str) -> Self {
        Self::new("VALIDATION_ERROR", message)
    }

    pub fn not_found(message: &str) -> Self {
        Self::new("NOT_FOUND", message)
    }

    pub fn io(message: &str) -> Self {
        Self::new("IO_ERROR", message)
    }

    pub fn crypto(message: &str) -> Self {
        Self::new("CRYPTO_ERROR", message)
    }

    pub fn database(message: &str) -> Self {
        // DB エラーはリポジトリで `?` により UI へ返すだけで、これまでサーバ側ログに
        // 残らなかった（接続失敗・クエリ失敗の全経路がこの1点を通る）。生成元である
        // ここで必ず記録し、後追いで原因（Postgres の実メッセージ）を特定できるようにする。
        log::error!("DATABASE_ERROR: {message}");
        Self::new("DATABASE_ERROR", message)
    }

    // --- SDK 生成に関するエラー分類（stderr 全文ではなく code + 要約で表す） ---

    pub fn openapi_validation(message: &str) -> Self {
        Self::new("OPENAPI_VALIDATION_ERROR", message)
    }

    pub fn generator_not_available(message: &str) -> Self {
        Self::new("GENERATOR_NOT_AVAILABLE", message)
    }

    pub fn generator_version_unsupported(message: &str) -> Self {
        Self::new("GENERATOR_VERSION_UNSUPPORTED", message)
    }

    pub fn sdk_output_invalid(message: &str) -> Self {
        Self::new("SDK_OUTPUT_INVALID", message)
    }

    pub fn sdk_generation_failed(message: &str) -> Self {
        Self::new("SDK_GENERATION_FAILED", message)
    }

    pub fn sdk_generation_timeout(message: &str) -> Self {
        Self::new("SDK_GENERATION_TIMEOUT", message)
    }
}

/// tokio-postgres のクエリエラーを DATABASE_ERROR へ統一変換する（`?` で伝播できる）。
impl From<tokio_postgres::Error> for AppError {
    fn from(error: tokio_postgres::Error) -> Self {
        Self::database(&format!("query failed: {error}"))
    }
}
