use serde::Serialize;
use serde_json::Value;

use crate::domain::connection::Connection;

/// 現在接続中DBの表示用サマリ（ヘッダ表示）。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CurrentConnectionDto {
    pub name: String,
    pub database: String,
    pub host: String,
}

impl CurrentConnectionDto {
    pub fn from_domain(connection: &Connection) -> Self {
        Self {
            name: connection.name.clone(),
            database: connection.database.clone(),
            host: connection.host.clone(),
        }
    }
}

/// Entity 自動 CRUD と @openapi 関数の method+path 衝突の1件（診断結果）。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RouteConflictDto {
    pub method: String,
    pub path: String,
    pub function_name: String,
    pub entity_table: String,
    pub entity_resource: String,
    pub recommendation: String,
}

/// スキーマ一覧の1行（スキーマ名/コメント/テーブル数/ビュー数）。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaSummaryDto {
    pub schema_name: String,
    pub comment: Option<String>,
    pub table_count: i64,
    pub view_count: i64,
}

/// OpenAPI ドキュメント一覧の1行。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentDto {
    pub id: i32,
    pub schema_name: String,
    /// 契約面。1 スキーマが postgrest と bff を持つので、行は (schema, profile) で一意。
    pub profile: String,
    pub title: String,
    pub version: String,
    pub description: Option<String>,
    /// ISO8601(UTC) 文字列。相対時刻表示はフロントで整形する。
    pub updated_at: String,
}

/// OpenAPI ドキュメント詳細（参照画面用）。各値の定義元判別のため annotation を含める。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentDetailDto {
    pub id: i32,
    pub schema_name: String,
    pub profile: String,
    pub title: String,
    pub version: String,
    pub description: Option<String>,
    pub generation_mode: String,
    pub updated_at: String,
    pub entity_operation_count: i64,
    pub function_operation_count: i64,
    pub operation_group_count: i64,
    pub component_count: i64,
    /// 割り当てられた servers（OpenAPI servers 配列）。
    pub servers: Value,
    /// Root security requirements 配列。
    pub root_security: Value,
    /// @openapi-document 宣言（title/version/description/generationMode の SoT）。未宣言なら null。
    pub annotation: Option<Value>,
}

/// エンティティ一覧の1行（フィールド数/オペレーション数を含む）。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EntitySummaryDto {
    pub id: i32,
    pub table_schema: String,
    pub table_name: String,
    pub resource_name: String,
    pub description: Option<String>,
    pub field_count: i64,
    pub operation_count: i64,
    /// 参照専用ポリシー（true なら list/get のみ生成される）。
    pub is_read_only: bool,
}

/// OpenAPI components の1件（参照ブラウザ用）。
/// scope: template（document_id NULL）/ document（固有Override）/ generated（Entity Schema 等）。
/// emitted: 最終 OpenAPI の components に実際に出力されるか。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentSummaryDto {
    pub section: String,
    pub name: String,
    pub scope: String,
    pub enabled: bool,
    pub emitted: bool,
    pub definition: Value,
}

/// フィールド（openapi_fields）。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FieldDto {
    pub id: i32,
    pub column_name: String,
    pub ordinal_position: i32,
    pub json_schema: Value,
    pub required: bool,
    pub is_primary_key: bool,
    pub is_read_only: bool,
    pub description: Option<String>,
}

/// オペレーション（openapi_operations）。Entity Operation と Function Operation の共通DTO。
/// id は operationRowId（DB内部の整数ID）、operationId は OpenAPI 文字列ID。混同しない。
/// entity_id と operation_group_id は同時に設定しない（ownerKind で所有者を示す）。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationDto {
    pub id: i32,
    pub operation_id: String,
    /// "entity" | "operationGroup"
    pub owner_kind: String,
    pub entity_id: Option<i32>,
    pub operation_group_id: Option<i32>,
    pub operation: String,
    pub method: String,
    pub path: String,
    /// OpenAPI tags（Entity は resource_name 既定、Function は @openapi.tags）。
    pub tags: Value,
    /// DB に保存された Operation 固有 security。NULL は Root 継承、[] は認証不要。
    pub security: Option<Value>,
    pub summary: Option<String>,
    pub description: Option<String>,
    pub parameters: Value,
    pub request_body: Option<Value>,
    pub responses: Value,
    pub required_fields: Vec<String>,
    /// Root security を合成した表示・検証用の実効 security。
    pub effective_security: Value,
    /// "root" | "operation" | "public"
    pub security_source: String,
    /// Function Operation の内部RPC（openapi_function_bindings）。Entity Operation では NULL。
    pub function_schema: Option<String>,
    pub function_name: Option<String>,
    pub identity_arguments: Option<String>,
    /// 生成元関数の COMMENT 原文（@openapi 宣言を含む）。Entity Operation では NULL。
    pub openapi_source: Option<String>,
}

/// 1ドキュメント分の OpenAPI 仕様（schema 名 + 完全な OpenAPI JSON）。
/// servers[] には登録済みサーバが内包される。SDK generator の入力に用いる。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenApiSpecDto {
    pub schema_name: String,
    /// どの契約面から出したか。SDK の生成物はこれで別物になる。
    pub profile: String,
    pub spec: Value,
}

/// FK リレーション（openapi_relations）。エンティティ視点で outgoing / incoming を示す。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationDto {
    pub constraint_name: String,
    /// "outgoing"（このエンティティが参照）/ "incoming"（このエンティティが参照される）。
    pub direction: String,
    pub relation_kind: String,
    pub from_schema: Option<String>,
    pub from_table: Option<String>,
    pub from_columns: Vec<String>,
    pub to_table_schema: String,
    pub to_table_name: String,
    pub to_columns: Vec<String>,
}

/// テーブル(エンティティ)詳細＝フィールド一覧＋オペレーション一覧＋リレーション＋$ref 解決用 components。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EntityDetailDto {
    pub fields: Vec<FieldDto>,
    pub operations: Vec<OperationDto>,
    pub relations: Vec<RelationDto>,
    /// components オブジェクト（schemas / responses / securitySchemes）。UI が $ref 解決に使う。
    pub components: Value,
}

/// manifest の宣言と公開関数の突き合わせ 1 件。
/// state は declared / undeclared / orphaned。undeclared は既定拒否で非公開に
/// なっているだけでエラーではないが、公開し忘れに気づく手がかりになる。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestCoverageDto {
    pub function_key: String,
    pub state: String,
}

/// manifest に宣言できる項目 1 件の定義。
///
/// 画面はこれを描き、項目一覧を自分で持たない。持つと DB が読むキーが増えたときに漏れ、
/// 欠けていること自体が分からなくなる。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestFieldDto {
    /// profile / defaults / operation / route
    pub level: String,
    /// ドット記法の相対パス。例: naming.stripPrefix.arg
    pub field: String,
    /// text / choice / chips / textarea / responses / routes / bind / auto
    pub kind: String,
    pub options: Option<Value>,
    pub is_required: bool,
    /// 未指定のとき受け継ぐ層。優先順位の高い順。
    pub inherits: Vec<String>,
    /// 推論元。null なら推論しない。
    pub derived_from: Option<String>,
    pub note: Option<String>,
}

/// profile ごとの宣言状態と生成状態。
/// declared=true / compiled=false は未 compile、逆は manifest から消した後の残骸。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenApiProfileDto {
    pub schema_name: String,
    pub profile: String,
    pub declared: bool,
    pub compiled: bool,
    pub operations: i32,
    pub operation_groups: i32,
    /// servers を除いた本体の sha256。環境が変わっても同じ契約なら同じ値。
    pub document_hash: Option<String>,
    pub updated_at: Option<String>,
}

/// 宣言を編集するための入力元。coverage が「何件足りないか」を数えるのに対し、
/// こちらは「何をどう埋めればよいか」を渡す。arguments を返すので bind を手書きさせない。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestFunctionDto {
    pub function_key: String,
    pub state: String,
    /// 関数の COMMENT。説明の原本はここで、manifest の description はここから起こす。
    pub comment: Option<String>,
    /// [{ name, type, required }]。required は DEFAULT を持たないこと。
    pub arguments: Value,
}

/// manifest の静的検証 1 件。最初の 1 件で止めず全件が返る。
/// location は manifest の構造をそのまま辿れる表記なので、編集箇所へのジャンプに使える。
/// 例: operations."receive(p_payload jsonb, p_operation text)".publicRoutes[0].bind.p_payload
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestDiagnosticDto {
    pub severity: String,
    pub location: String,
    pub code: String,
    pub message: String,
    pub hint: Option<String>,
}

/// スキーマ 1 件分の manifest の状態。
/// stored は DB の下書き。file 側との突き合わせは UI が digest で行う。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestDto {
    pub schema_name: String,
    pub manifest: Option<Value>,
    pub updated_at: Option<String>,
}
