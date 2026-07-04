use crate::dto::compile_schema_request::CompileSchemaRequest;
use crate::dto::compile_schema_response::CompileSchemaResponse;
use crate::errors::app_error::AppError;

pub struct SchemaService;

impl SchemaService {
    pub fn new() -> Self {
        Self
    }

    pub async fn compile_schema(&self, request: CompileSchemaRequest) -> Result<CompileSchemaResponse, AppError> {
        if request.schema_name.trim().is_empty() {
            return Err(AppError::validation("schema_name is required"));
        }

        Ok(CompileSchemaResponse {
            schema_name: request.schema_name,
            document_id: None,
            operation_count: 0,
        })
    }
}
