/** 公開関数と manifest の宣言の突き合わせ結果。 */
export type CoverageState =
  /** 宣言があり、関数も存在する */
  | 'declared'
  /** 関数はあるが宣言が無い。既定拒否で非公開になっているだけでエラーではない */
  | 'undeclared'
  /** 宣言はあるが関数が無い。compile が function_not_found で止まる */
  | 'orphaned';

export type ManifestCoverage = {
  functionKey: string;
  state: CoverageState;
};

/** 関数の入力引数。bind の行はこれをそのまま並べて作る。 */
export type ManifestArgument = {
  name: string;
  type: string;
  /** DEFAULT を持たない。bind を省くと compile が止まる。 */
  required: boolean;
};

/**
 * 宣言を編集するための入力元。
 * 引数と関数 COMMENT を DB から引くので、人が引数名を書き写す必要がない。
 */
export type ManifestFunction = {
  functionKey: string;
  state: CoverageState;
  /** 関数の COMMENT。説明の原本はここで、manifest の description はここから起こす。 */
  comment: string | null;
  arguments: ManifestArgument[];
};

/** compile を止めるのは error だけ。warning / info は生成できるが確認したい事柄。 */
export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export type ManifestDiagnostic = {
  severity: DiagnosticSeverity;
  /** どのスキーマの指摘か。複数スキーマをまとめて見るときに付く。 */
  schemaName?: string;
  /**
   * manifest の構造をそのまま辿れる表記。JSON Pointer ではないので、
   * 編集フォームのパスへ機械的に写せる。
   * 例: operations."receive(p_payload jsonb, p_operation text)".publicRoutes[0].bind.p_payload
   */
  location: string;
  code: string;
  message: string;
  hint: string | null;
};

/** DB に入っている宣言。未登録なら manifest が null。 */
export type StoredManifest = {
  schemaName: string;
  manifest: ManifestDocument | null;
  updatedAt: string | null;
};

/** 原本（リポジトリの manifest.sql）と下書き（DB）の一致状態。 */
export type SyncState =
  /** どちらにも無い */
  | 'none'
  /** DB にだけある。書き出さないと次の mox init で消える */
  | 'draft-only'
  /** 内容が一致している */
  | 'synced'
  /** ファイルにだけある、または内容が違う */
  | 'file-ahead';

/**
 * profile の値集合。
 *
 * postgrest は PostgREST が実際に受ける形（path=/rpc/{proname}、method=POST 固定）、
 * bff は外部へ公開する形（publicRoutes が宣言するリソース指向の URI）。
 * 技術的な二分なので固定でよく、増やす必要が出た時点で足す。
 * DB 側も rv_meta.openapi_documents.profile の CHECK 制約が同じ 2 値を持つ。
 */
export const PROFILE_NAMES = ['postgrest', 'bff'] as const;
export type ProfileName = (typeof PROFILE_NAMES)[number];

export const GENERATION_MODES = ['entity_and_function', 'function_only'] as const;
export const OPERATION_ID_STYLES = ['prefixed', 'bare'] as const;
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export type ManifestNaming = {
  stripPrefix?: { arg?: string; table?: string; column?: string; schema?: string };
  case?: { property?: string; resource?: string };
};

export type ManifestProfile = {
  basePath?: string;
  /**
   * その契約面の全 operation に効く既定。
   * profile は信頼境界なので、内部契約と公開契約で security が変わる。
   * ここが無いと、公開ルートごとに同じ宣言を書き直すことになる。
   */
  defaults?: ManifestDefaults;
  title?: string;
  version?: string;
  description?: string;
  generationMode?: string;
  operationIdStyle?: string;
  naming?: ManifestNaming;
};

/** bind の 1 引数。const はルートが値を固定するので外部に出さない。 */
export type BindRule = { from?: 'body' | 'path'; name?: string; const?: unknown };

export type RouteParameter = {
  name: string;
  in: 'path';
  required: true;
  schema: { type: string };
};

export type PublicRoute = {
  operationId?: string;
  method?: string;
  /** basePath からの相対。先頭は "/"。 */
  path?: string;
  summary?: string;
  description?: string;
  parameters?: RouteParameter[];
  bind?: Record<string, BindRule>;
  tags?: string[];
  security?: unknown[];
  responses?: Record<string, unknown>;
};

export type ManifestOperation = {
  operationId?: string;
  operationGroup?: string;
  tags?: string[];
  security?: unknown[];
  description?: string;
  responses?: Record<string, unknown>;
  /** 宣言があるものだけ bff ドキュメントに出る（既定拒否）。 */
  publicRoutes?: PublicRoute[];
};

/** defaults は operation へ浅くマージされる。同じキーは operation 側が勝つ。 */
export type ManifestDefaults = {
  operationGroup?: string;
  tags?: string[];
  security?: unknown[];
};

export type ManifestDocument = {
  schema?: string;
  profiles?: Partial<Record<ProfileName, ManifestProfile>>;
  defaults?: ManifestDefaults;
  operations?: Record<string, ManifestOperation>;
};

/** テーブルから自動生成された CRUD。宣言が無いので編集できない。 */
export type CatalogCrud = {
  schemaName: string;
  tableName: string;
  resourceName: string;
  operations: string[];
};

/** マニフェスト一覧の 1 行。スキーマごとに 1 件。 */
export type ManifestOverview = {
  schemaName: string;
  comment: string | null;
  hasManifest: boolean;
  /** 出力される内容が変わるので一覧に出す。 */
  generationMode: string | null;
  profiles: ProfileName[];
  operationCount: number;
  publicRouteCount: number;
  undeclaredCount: number;
  errorCount: number;
  warningCount: number;
};

/** security の宣言は「要認証」か「公開」の二択に畳む。生の JSON を書かせない。 */
export const BEARER_SECURITY: unknown[] = [{ bearerAuth: [] }];

export function isPublicSecurity(security: unknown[] | undefined): boolean {
  return Array.isArray(security) && security.length === 0;
}
