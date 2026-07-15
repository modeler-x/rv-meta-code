use crate::application::generator_registry::GeneratorRegistry;
use crate::dto::sdk_dto::GeneratorDescriptor;
use crate::errors::app_error::AppError;
use crate::infrastructure::default_generator_registry::DefaultGeneratorRegistry;

/// 登録済み Generator（Adapter）と対応ターゲットを列挙する。
/// UI は固定配列を持たず、これを一覧化して選択肢を構成する。
#[tauri::command]
pub async fn list_generators() -> Result<Vec<GeneratorDescriptor>, AppError> {
    Ok(DefaultGeneratorRegistry::new().list())
}
