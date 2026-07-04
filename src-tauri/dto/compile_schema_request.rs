use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct CompileSchemaRequest {
    pub schema_name: String,
}
