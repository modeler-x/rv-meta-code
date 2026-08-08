/** 項目が宣言される階層。 */
export type FieldLevel = 'profile' | 'defaults' | 'operation' | 'route';

/** 画面がその項目をどう描くか。 */
export type FieldKind =
  | 'text'
  | 'choice'
  | 'chips'
  | 'textarea'
  /** status と参照先を選ぶ専用の編集器。生の JSON は書かせない。 */
  | 'responses'
  /** publicRoutes。公開するかどうかの判断そのもの。 */
  | 'routes'
  /** 引数ごとの割り当て。行は関数の引数から並ぶ。 */
  | 'bind'
  /** 人が触らない。他の項目から導出される（parameters は path から）。 */
  | 'auto';

/**
 * manifest に宣言できる項目 1 件の定義。rv_meta.manifest_fields() が原本。
 *
 * 画面はこれを描くだけで、項目の一覧を自分では持たない。持つと DB が読むキーが
 * 増えたときに漏れ、欠けていること自体が分からなくなる。
 */
export type ManifestField = {
  level: FieldLevel;
  /** ドット記法の相対パス。例: naming.stripPrefix.arg */
  field: string;
  kind: FieldKind;
  options: string[] | null;
  isRequired: boolean;
  /** 未指定のとき受け継ぐ層。優先順位の高い順。 */
  inherits: FieldLevel[];
  /** 推論元の説明。null なら推論しない。 */
  derivedFrom: string | null;
  note: string | null;
};

/**
 * 有効値がどこから来たか。
 *
 * 編集画面は「空欄を並べて人に埋めさせる」形にしない。全項目に有効値と由来を持たせ、
 * 違うところだけ上書きさせる。そのためには、いま効いている値の出どころが要る。
 */
export type FieldSource =
  /** その operation / ルート自身が宣言している */
  | 'own'
  /** profiles.<profile>.defaults */
  | 'profile'
  /** manifest 直下の defaults */
  | 'defaults'
  /** カタログ・戻り値の型・命名規則からの推論 */
  | 'inferred'
  /** 他の項目から導出（parameters は path から） */
  | 'auto'
  /** どこにも無い。未設定のまま生成されるか、error になる */
  | 'none';

/** 1 項目の有効値。画面はこの配列を行として並べる。 */
export type EffectiveField = {
  definition: ManifestField;
  /** 表示用の値。編集器へ渡す形も兼ねる。 */
  value: string;
  /** 宣言に入っている生の値。未宣言なら undefined。 */
  declared: unknown;
  source: FieldSource;
};

/**
 * 上書きをどこへ書くか。
 *
 * 階層を先に理解していなくても書けるよう、上書きの操作中に選ばせる。
 * 「この operation だけ」「この契約面の全 operation」「全体」が、そのまま
 * operation / profiles.<profile>.defaults / defaults に対応する。
 */
export type OverrideScope = 'own' | 'profile' | 'defaults';

/** security は「要認証 / 公開」の二択に畳む。生の JSON を書かせない。 */
export const SECURITY_LABELS = { bearer: '要認証', public: '公開' } as const;
