export type LanguageCode = 'en' | 'ja';

export const messages = {
  en: {
    nav_welcome: 'Welcome', nav_schemas: 'Schemas', nav_documents: 'Documents', nav_entities: 'Entities', nav_recent: 'Recent',
    guest: 'Guest', connections: 'Connections',
    back: 'Back', open: 'Open', generate: 'Generate', cancel: 'Cancel', save: 'Save', close: 'Close', edit: 'Edit', delete: 'Delete', add: 'Add',
    title_welcome: 'Welcome', title_schemas: 'Schemas', title_documents: 'Documents', title_entities: 'Entities', title_recent: 'Recent', title_profile: 'Profile', title_connections: 'Connections',
    welcome_desc: 'Generate APIs, SDKs and OpenAPI docs straight from your PostgreSQL schema — and keep the metadata in sync.',
    card_schema_t: 'Schemas', card_schema_d: 'Browse database schemas and generate documentation.',
    card_entities_t: 'Browse Entities', card_entities_d: 'Inspect tables, views, columns and relations.',
    card_docs_t: 'OpenAPI Documents', card_docs_d: 'Review the generated API specifications.',
    card_recent_t: 'Recent Activity', card_recent_d: 'Jump back to what you were working on.',
    sec_schemas: 'Schemas', schemas_hint: 'Select a schema to generate docs', unit_tables: 'tables', unit_views: 'views',
    sec_documents: 'Generated OpenAPI documents', sec_doc_entities: 'Entities in this document', unit_operations: 'operations', openapi: 'OpenAPI',
    sec_tables: 'Tables', sec_views: 'Views',
    sec_fields: 'OpenAPI Fields', sec_operations: 'Operations', sec_relationships: 'Relationships',
    op_params: 'Parameters', op_body: 'Request Body', op_responses: 'Responses', req_required: 'required', req_optional: 'optional', mime_json: 'application/json',
    preferences: 'Preferences', language: 'Language',
    p_empty_title: 'No profile yet', p_empty_desc: 'Register a profile to manage your metadata and connection presets.',
    p_create: 'Create Profile', p_create_title: 'Create Profile', p_edit_title: 'Edit Profile',
    f_fullname: 'Full name', f_email: 'Email', f_org: 'Organization', f_role: 'Role',
    p_role: 'Role', p_org: 'Organization', p_email: 'Email', p_status: 'Status', status_registered: 'Registered',
    role_developer: 'Developer', role_dba: 'DBA', role_admin: 'Admin', btn_edit_profile: 'Edit Profile',
    c_databases: 'Databases', c_add: 'Add Database', c_active: 'Active', c_set_active: 'Set active', c_form_add: 'Add Database', c_form_edit: 'Edit Database',
    c_test: 'Test connection', c_testing: 'Testing…', c_secret_hint: 'Stored encrypted on this device', c_password_keep: 'Leave blank to keep current password',
    f_name: 'Name', f_host: 'Host', f_port: 'Port', f_database: 'Database', f_user: 'Role', f_password: 'Password',
    gen_confirm_title: 'Generate documentation?', gen_confirm_msg: 'Generate an OpenAPI document from schema "{schema}"? This queries the connected database.',
    gen_run: 'Generate', gen_running_title: 'Generating documentation', gen_done_title: 'Documentation generated', gen_err_title: 'Generation failed', gen_view_doc: 'View Document',
    gen_err_detail: 'No tables or views were found in schema "{schema}".'
  },
  ja: {
    nav_welcome: 'ようこそ', nav_schemas: 'スキーマ', nav_documents: 'ドキュメント', nav_entities: 'エンティティ', nav_recent: '最近',
    guest: 'ゲスト', connections: '接続先',
    back: '戻る', open: '開く', generate: '生成', cancel: 'キャンセル', save: '保存', close: '閉じる', edit: '編集', delete: '削除', add: '追加',
    title_welcome: 'ようこそ', title_schemas: 'スキーマ', title_documents: 'ドキュメント', title_entities: 'エンティティ', title_recent: '最近', title_profile: 'プロフィール', title_connections: '接続先',
    welcome_desc: 'PostgreSQL のスキーマから API・SDK・OpenAPI ドキュメントを生成し、メタデータを常に同期します。',
    card_schema_t: 'スキーマ', card_schema_d: 'データベースのスキーマを参照し、ドキュメントを生成します。',
    card_entities_t: 'エンティティを参照', card_entities_d: 'テーブル・ビュー・カラム・リレーションを確認します。',
    card_docs_t: 'OpenAPI ドキュメント', card_docs_d: '生成された API 仕様を参照します。',
    card_recent_t: '最近のアクティビティ', card_recent_d: '作業していた画面にすぐ戻れます。',
    sec_schemas: 'スキーマ', schemas_hint: '行を選択してドキュメントを生成', unit_tables: 'テーブル', unit_views: 'ビュー',
    sec_documents: '生成された OpenAPI ドキュメント', sec_doc_entities: 'このドキュメントのエンティティ', unit_operations: '操作', openapi: 'OpenAPI',
    sec_tables: 'テーブル', sec_views: 'ビュー',
    sec_fields: 'OpenAPI フィールド', sec_operations: 'オペレーション', sec_relationships: 'リレーション',
    op_params: 'パラメータ', op_body: 'リクエストボディ', op_responses: 'レスポンス', req_required: '必須', req_optional: '任意', mime_json: 'application/json',
    preferences: '環境設定', language: '言語',
    p_empty_title: 'プロフィールが未登録です', p_empty_desc: 'プロフィールを登録すると、メタデータと接続設定を管理できます。',
    p_create: 'プロフィールを作成', p_create_title: 'プロフィールを作成', p_edit_title: 'プロフィールを編集',
    f_fullname: '氏名', f_email: 'メール', f_org: '組織', f_role: 'ロール',
    p_role: 'ロール', p_org: '組織', p_email: 'メール', p_status: 'ステータス', status_registered: '登録済み',
    role_developer: '開発者', role_dba: 'DBA', role_admin: '管理者', btn_edit_profile: 'プロフィールを編集',
    c_databases: 'データベース', c_add: 'データベースを追加', c_active: '使用中', c_set_active: '使用中にする', c_form_add: 'データベースを追加', c_form_edit: 'データベースを編集',
    c_test: '接続テスト', c_testing: 'テスト中…', c_secret_hint: 'この端末に暗号化して保存されます', c_password_keep: '空欄で現在のパスワードを維持',
    f_name: '名前', f_host: 'ホスト', f_port: 'ポート', f_database: 'データベース', f_user: 'ロール', f_password: 'パスワード',
    gen_confirm_title: 'ドキュメントを生成しますか？', gen_confirm_msg: 'スキーマ「{schema}」から OpenAPI ドキュメントを生成します。接続中のデータベースへクエリを発行します。',
    gen_run: '実行', gen_running_title: 'ドキュメントを生成中', gen_done_title: 'ドキュメントを生成しました', gen_err_title: '生成に失敗しました', gen_view_doc: 'ドキュメントを開く',
    gen_err_detail: 'スキーマ「{schema}」にテーブル・ビューが見つかりませんでした。'
  }
} satisfies Record<LanguageCode, Record<string, string>>;

export const generationSteps: Record<LanguageCode, string[]> = {
  en: ['Connecting to database', 'Introspecting schema', 'Resolving relationships', 'Generating OpenAPI document', 'Emitting SDK'],
  ja: ['データベースに接続中', 'スキーマを走査中', 'リレーションを解決中', 'OpenAPI ドキュメントを生成中', 'SDK を出力中']
};

export type MessageKey = keyof (typeof messages)['en'];
