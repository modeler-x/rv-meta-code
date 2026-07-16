use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct AppError {
    pub code: String,
    pub message: String,
    /// 解決の手掛かり（Postgres の HINT 等）。無ければ JSON へ出さない。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hint: Option<String>,
}

impl AppError {
    fn new(code: &str, message: &str) -> Self {
        Self {
            code: code.to_string(),
            message: message.to_string(),
            hint: None,
        }
    }

    fn new_with_hint(code: &str, message: &str, hint: Option<String>) -> Self {
        Self {
            code: code.to_string(),
            message: message.to_string(),
            hint,
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

/// tokio-postgres のエラーを SQLSTATE で分類して AppError へ変換する（`?` で伝播できる）。
/// `Display`（{error}）はカテゴリ名（"db error" 等）しか返さないため、実本文は cause 側の
/// DbError から取り出す。人間可読な message（+ detail）と hint を分離し、内部コード（SQLSTATE）は
/// UI 本文に混ぜずログにのみ残す。
///   - P0001（RAISE_EXCEPTION＝compile の検証エラー）・class 23（制約違反）: COMPILE_ERROR
///   - それ以外（接続断・実行時 DB エラー等）: DATABASE_ERROR
impl From<tokio_postgres::Error> for AppError {
    fn from(error: tokio_postgres::Error) -> Self {
        let db = match error.as_db_error() {
            Some(db) => db,
            None => {
                // 接続断・プロトコル等、SQLSTATE を伴わない障害はそのまま DATABASE_ERROR。
                let message = error.to_string();
                log::error!("DATABASE_ERROR: {message}");
                return Self::new("DATABASE_ERROR", &format!("query failed: {message}"));
            }
        };

        let sqlstate = db.code().code();
        let code = match sqlstate {
            // PL/pgSQL の RAISE（compile の一意性・注釈検証など）と整合性制約違反は、
            // 障害ではなく「定義側の直すべき問題」なので COMPILE_ERROR として区別する。
            "P0001" => "COMPILE_ERROR",
            s if s.starts_with("23") => "COMPILE_ERROR",
            _ => "DATABASE_ERROR",
        };

        // UI 表示用: message 本文（＋ detail）。SQLSTATE は含めない。
        let mut message = db.message().to_string();
        if let Some(d) = db.detail() {
            message.push_str(&format!("\n{d}"));
        }
        let hint = db.hint().map(|h| h.to_string());

        // ログには SQLSTATE・detail・hint を含む技術情報を必ず残す（原因追跡用）。
        let mut technical = format!("[{sqlstate}] {}", db.message());
        if let Some(d) = db.detail() {
            technical.push_str(&format!("; detail: {d}"));
        }
        if let Some(h) = &hint {
            technical.push_str(&format!("; hint: {h}"));
        }
        log::error!("{code}: {technical}");

        Self::new_with_hint(code, &message, hint)
    }
}
