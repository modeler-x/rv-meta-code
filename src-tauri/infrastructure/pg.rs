use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

use tauri::async_runtime;
use tauri::async_runtime::Mutex as AsyncMutex;
use tokio_postgres::{Client, NoTls};

use crate::domain::connection::Connection;
use crate::errors::app_error::AppError;

const CONNECT_TIMEOUT_SECS: u64 = 8;
const DEFAULT_PORT: u16 = 5432;

/// PostgreSQL への接続先。現在接続中の [`Connection`] から生成する。
pub struct PgTarget {
    pub host: String,
    pub port: String,
    pub database: String,
    pub user: String,
    pub password: String,
    /// スキーマ一覧から除外するスキーマ名（複数）。
    pub excluded_schemas: Vec<String>,
}

impl PgTarget {
    pub fn from_connection(connection: &Connection) -> Self {
        Self {
            host: connection.host.clone(),
            port: connection.port.clone(),
            database: connection.database.clone(),
            user: connection.user.clone(),
            password: connection.password.clone(),
            excluded_schemas: connection.excluded_schemas.clone(),
        }
    }
}

/// 接続先へ接続し、駆動 future をバックグラウンドに載せた [`Client`] を返す。
/// 生成ロジックは DB(rv_meta) 側にあるため、ここではクエリ実行のための接続確立のみを担う。
pub async fn connect(target: &PgTarget) -> Result<Client, AppError> {
    let port = target.port.trim().parse::<u16>().unwrap_or(DEFAULT_PORT);

    let mut config = tokio_postgres::Config::new();
    config
        .host(&target.host)
        .port(port)
        .user(&target.user)
        .dbname(&target.database)
        .connect_timeout(Duration::from_secs(CONNECT_TIMEOUT_SECS));
    if !target.password.is_empty() {
        config.password(&target.password);
    }

    let (client, connection) = config
        .connect(NoTls)
        .await
        .map_err(|error| AppError::database(&format!("database connection failed: {error}")))?;

    // 接続の driver future はバックグラウンドで駆動する必要がある。
    async_runtime::spawn(async move {
        let _ = connection.await;
    });

    Ok(client)
}

/// 接続先ごとに 1 本だけ保持する接続。
///
/// 以前は 1 クエリごとに接続を張っていた。一覧の表示で 19 スキーマ × 5 クエリ =
/// 95 接続が一斉に開き、max_connections(100) を突いて
/// `database connection failed` が出ていた。
///
/// プールを増やす必要はない。tokio-postgres の Client は 1 本の接続へ複数のクエリを
/// パイプラインで詰めて送るので、同時に呼んでも直列化しない。
/// 要るのは数ではなく、**切断からの復帰**。閉じていたら次の呼び出しで張り直す。
type Shared = Arc<AsyncMutex<Option<Arc<Client>>>>;

fn sessions() -> &'static Mutex<HashMap<String, Shared>> {
    static SESSIONS: OnceLock<Mutex<HashMap<String, Shared>>> = OnceLock::new();
    SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn key_of(target: &PgTarget) -> String {
    format!("{}:{}/{}@{}", target.host, target.port, target.database, target.user)
}

/// 接続先の共有クライアント。閉じていれば張り直す。
pub async fn client(target: &PgTarget) -> Result<Arc<Client>, AppError> {
    let shared = {
        let mut map = sessions().lock().expect("session registry poisoned");
        map.entry(key_of(target)).or_insert_with(|| Arc::new(AsyncMutex::new(None))).clone()
    };

    let mut slot = shared.lock().await;
    if let Some(existing) = slot.as_ref() {
        if !existing.is_closed() {
            return Ok(Arc::clone(existing));
        }
    }

    let fresh = Arc::new(connect(target).await?);
    *slot = Some(Arc::clone(&fresh));
    Ok(fresh)
}

/// 接続先を切り替えたときに、保持していた接続を捨てる。
pub fn forget_sessions() {
    if let Ok(mut map) = sessions().lock() {
        map.clear();
    }
}
