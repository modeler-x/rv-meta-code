use serde_json::Value;
use tauri::AppHandle;

use crate::commands::metadata::build_service;
use crate::errors::app_error::AppError;

fn require_schema(schema_name: &str) -> Result<&str, AppError> {
    let schema = schema_name.trim();
    if schema.is_empty() {
        return Err(AppError::validation("schema_name is required"));
    }
    Ok(schema)
}

/// カタログから骨子を起こし、保存済みの宣言へマージした結果を返す。**保存はしない。**
/// 推測した security（要認証）や tags が確認を経ずに確定しないよう、投入は別操作にする。
#[tauri::command]
pub async fn draft_manifest(app: AppHandle, schema_name: String) -> Result<Value, AppError> {
    let schema = require_schema(&schema_name)?;
    build_service(&app)?.draft_manifest(schema).await
}

/// manifest を検証してから投入する。error があれば書かずに例外になる。
#[tauri::command]
pub async fn load_manifest(
    app: AppHandle,
    schema_name: String,
    manifest: Value,
) -> Result<Value, AppError> {
    let schema = require_schema(&schema_name)?;
    build_service(&app)?.load_manifest(schema, &manifest).await
}
