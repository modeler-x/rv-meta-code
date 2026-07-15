use crate::dto::sdk_dto::{GenerateSdkRequest, GenerateSdkResult, GeneratorCapabilities};
use crate::errors::app_error::AppError;

/// SDK 生成の Application 層 Port。特定 Generator CLI への依存を Infrastructure Adapter へ隔離する。
/// 入力は検証済み OpenAPI Document と生成設定だけ（rv-meta テーブルを直接読まない）。
/// 将来、別 CLI / Docker / Remote Generator を追加しても本 Port は変更しない。
pub trait SdkGenerator {
    /// Generator の存在・version を返す（実行はしない）。
    fn capabilities(&self) -> Result<GeneratorCapabilities, AppError>;

    /// SDK を生成する。途中失敗した出力を成功扱いしない。
    fn generate(&self, request: &GenerateSdkRequest) -> Result<GenerateSdkResult, AppError>;
}
