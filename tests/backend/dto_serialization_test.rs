// DTO の IPC 境界（camelCase）と Operation 共通モデルの所有者表現を検証する。
use rv_meta_code_lib::dto::metadata_dto::OperationDto;
use rv_meta_code_lib::dto::operation_group_dto::OperationGroupSummaryDto;
use serde_json::json;

fn function_operation() -> OperationDto {
    OperationDto {
        id: 10,
        operation_id: "authGetUser".to_string(),
        owner_kind: "operationGroup".to_string(),
        entity_id: None,
        operation_group_id: Some(5),
        operation: "authGetUser".to_string(),
        method: "GET".to_string(),
        path: "/auth/users/{userId}".to_string(),
        tags: json!(["Auth"]),
        security: Some(json!([{ "bearerAuth": [] }])),
        summary: None,
        description: None,
        parameters: json!([]),
        request_body: None,
        responses: json!({}),
        required_fields: vec![],
        effective_security: json!([{ "bearerAuth": [] }]),
        security_source: "operation".to_string(),
        function_schema: Some("rv_auth".to_string()),
        function_name: Some("get_user".to_string()),
        identity_arguments: Some("p_user_id bigint".to_string()),
        openapi_source: Some("get user\n@openapi {\"operationId\":\"authGetUser\"}".to_string()),
    }
}

#[test]
fn operation_dto_serializes_row_id_and_operation_id_as_camel_case() {
    let value = serde_json::to_value(function_operation()).unwrap();
    // operationRowId は id、OpenAPI の operationId は文字列。混同しない。
    assert_eq!(value["id"], json!(10));
    assert_eq!(value["operationId"], json!("authGetUser"));
    assert_eq!(value["ownerKind"], json!("operationGroup"));
    assert_eq!(value["securitySource"], json!("operation"));
    assert_eq!(value["effectiveSecurity"], json!([{ "bearerAuth": [] }]));
}

#[test]
fn function_operation_has_group_owner_and_no_entity_owner() {
    let op = function_operation();
    // 所有者は entity / operationGroup のどちらか一方だけ。
    assert!(op.entity_id.is_none());
    assert_eq!(op.operation_group_id, Some(5));
    assert_eq!(op.owner_kind, "operationGroup");
}

#[test]
fn operation_group_summary_serializes_camel_case() {
    let dto = OperationGroupSummaryDto {
        id: 5,
        document_id: 9,
        group_key: "auth".to_string(),
        display_name: "Auth".to_string(),
        description: None,
        operation_count: 3,
    };
    let value = serde_json::to_value(dto).unwrap();
    assert_eq!(value["documentId"], json!(9));
    assert_eq!(value["groupKey"], json!("auth"));
    assert_eq!(value["operationCount"], json!(3));
}
