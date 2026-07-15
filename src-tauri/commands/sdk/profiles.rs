use tauri::{AppHandle, Manager};

use crate::dto::sdk_profile_dto::SdkGenerationProfileDto;
use crate::errors::app_error::AppError;
use crate::infrastructure::profile_store::ProfileStore;

fn store(app: &AppHandle) -> Result<ProfileStore, AppError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| AppError::io(&format!("app data dir unavailable: {error}")))?;
    Ok(ProfileStore::new(&dir))
}

/// 保存済み SDK Generation Profile を列挙する（名前順）。
#[tauri::command]
pub async fn list_sdk_profiles(app: AppHandle) -> Result<Vec<SdkGenerationProfileDto>, AppError> {
    let mut profiles = store(&app)?.load()?;
    profiles.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(profiles)
}

/// Profile を upsert する（name をキーに同名を置換）。保存後の一覧を返す。
#[tauri::command]
pub async fn save_sdk_profile(
    app: AppHandle,
    profile: SdkGenerationProfileDto,
) -> Result<Vec<SdkGenerationProfileDto>, AppError> {
    if profile.name.trim().is_empty() {
        return Err(AppError::validation("profile name is required"));
    }
    let store = store(&app)?;
    let mut profiles = store.load()?;
    profiles.retain(|p| p.name != profile.name);
    profiles.push(profile);
    profiles.sort_by(|a, b| a.name.cmp(&b.name));
    store.save_all(&profiles)?;
    Ok(profiles)
}

/// name の Profile を削除する。削除後の一覧を返す。
#[tauri::command]
pub async fn delete_sdk_profile(
    app: AppHandle,
    name: String,
) -> Result<Vec<SdkGenerationProfileDto>, AppError> {
    let store = store(&app)?;
    let mut profiles = store.load()?;
    profiles.retain(|p| p.name != name);
    profiles.sort_by(|a, b| a.name.cmp(&b.name));
    store.save_all(&profiles)?;
    Ok(profiles)
}
