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
        Self::new("DATABASE_ERROR", message)
    }
}

/// tokio-postgres のクエリエラーを DATABASE_ERROR へ統一変換する（`?` で伝播できる）。
impl From<tokio_postgres::Error> for AppError {
    fn from(error: tokio_postgres::Error) -> Self {
        Self::database(&format!("query failed: {error}"))
    }
}
