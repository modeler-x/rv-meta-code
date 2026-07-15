use crate::dto::compile_schema_response::CompileSchemaResponse;
use crate::dto::metadata_dto::{
    DocumentDto, EntityDetailDto, EntitySummaryDto, OpenApiSpecDto, OperationDto, SchemaSummaryDto,
};
use crate::dto::operation_group_dto::{OperationGroupDetailDto, OperationGroupSummaryDto};
use crate::errors::app_error::AppError;
use crate::repositories::metadata_repository::MetadataRepository;

/// メタデータ照会のユースケース調整層。SQL・接続・Row 変換は Repository に委譲する。
pub struct MetadataService {
    repository: MetadataRepository,
}

impl MetadataService {
    pub fn new(repository: MetadataRepository) -> Self {
        Self { repository }
    }

    pub async fn list_schemas(&self) -> Result<Vec<SchemaSummaryDto>, AppError> {
        self.repository.list_schemas().await
    }

    pub async fn list_documents(&self) -> Result<Vec<DocumentDto>, AppError> {
        self.repository.list_documents().await
    }

    pub async fn list_entities(
        &self,
        schema: Option<&str>,
    ) -> Result<Vec<EntitySummaryDto>, AppError> {
        self.repository.list_entities(schema).await
    }

    pub async fn entity_detail(&self, entity_id: i32) -> Result<EntityDetailDto, AppError> {
        self.repository.entity_detail(entity_id).await
    }

    pub async fn get_operation(&self, operation_row_id: i32) -> Result<OperationDto, AppError> {
        self.repository.get_operation(operation_row_id).await
    }

    pub async fn get_openapi_specs(
        &self,
        schemas: &[String],
    ) -> Result<Vec<OpenApiSpecDto>, AppError> {
        self.repository.get_openapi_specs(schemas).await
    }

    pub async fn set_read_only(
        &self,
        schema: &str,
        table: &str,
        is_read_only: bool,
    ) -> Result<(), AppError> {
        self.repository.set_read_only(schema, table, is_read_only).await
    }

    pub async fn compile(&self, schema: &str) -> Result<CompileSchemaResponse, AppError> {
        self.repository.compile(schema).await
    }

    pub async fn list_operation_groups(
        &self,
        schema: &str,
    ) -> Result<Vec<OperationGroupSummaryDto>, AppError> {
        self.repository.list_operation_groups(schema).await
    }

    pub async fn get_operation_group_detail(
        &self,
        schema: &str,
        group_key: &str,
    ) -> Result<OperationGroupDetailDto, AppError> {
        self.repository.operation_group_detail(schema, group_key).await
    }
}
