use crate::domain::connection::Connection;
use crate::errors::app_error::AppError;
use crate::infrastructure::connection_store::ConnectionStore;

/// 接続情報の永続化アクセスを担う。ビジネスルールは持たない。
pub struct ConnectionRepository {
    store: ConnectionStore,
}

impl ConnectionRepository {
    pub fn new(store: ConnectionStore) -> Self {
        Self { store }
    }

    pub fn list(&self) -> Result<Vec<Connection>, AppError> {
        self.store.load()
    }

    pub fn find(&self, id: &str) -> Result<Option<Connection>, AppError> {
        Ok(self.list()?.into_iter().find(|connection| connection.id == id))
    }

    /// 使用中（is_current）の接続を返す。無ければ None。
    pub fn current(&self) -> Result<Option<Connection>, AppError> {
        Ok(self.list()?.into_iter().find(|connection| connection.is_current))
    }

    pub fn save_all(&self, connections: &[Connection]) -> Result<(), AppError> {
        self.store.save_all(connections)
    }
}
