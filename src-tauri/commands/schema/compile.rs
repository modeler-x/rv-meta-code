use crate::application::schema_service::SchemaService;
use crate::dto::compile_schema_request::CompileSchemaRequest;
use crate::dto::compile_schema_response::CompileSchemaResponse;
use crate::errors::app_error::AppError;

#[tauri::command]
pub async fn compile_schema(request: CompileSchemaRequest) -> Result<CompileSchemaResponse, AppError> {
    let service = SchemaService::new();
    service.compile_schema(request).await
}
