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
/// `Display`（{error}）はカテゴリ名（"db error" 等）しか返さず、実本文は cause 側の
/// DbError にあるため、SQLSTATE・message・detail・hint を取り出して残す。
impl From<tokio_postgres::Error> for AppError {
    fn from(error: tokio_postgres::Error) -> Self {
        let detail = match error.as_db_error() {
            Some(db) => {
                let mut text = format!("[{}] {}", db.code().code(), db.message());
                if let Some(d) = db.detail() {
                    text.push_str(&format!("; detail: {d}"));
                }
                if let Some(h) = db.hint() {
                    text.push_str(&format!("; hint: {h}"));
                }
                text
            }
            None => error.to_string(),
        };
        Self::database(&format!("query failed: {detail}"))
    }
}
