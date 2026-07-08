use tauri::AppHandle;

use crate::commands::metadata::current_connection as resolve_current;
use crate::dto::metadata_dto::CurrentConnectionDto;
use crate::errors::app_error::AppError;

/// 現在接続中DBのサマリ（database / host）を返す。未選択なら None。
#[tauri::command]
pub async fn get_current_connection(app: AppHandle) -> Result<Option<CurrentConnectionDto>, AppError> {
    let connection = resolve_current(&app)?;
    Ok(connection
        .as_ref()
        .map(CurrentConnectionDto::from_domain))
}
