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

/** compile を止めるのは error だけ。warning / info は生成できるが確認したい事柄。 */
export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export type ManifestDiagnostic = {
  severity: DiagnosticSeverity;
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

/** DB に入っている下書き。未登録なら manifest が null。 */
export type StoredManifest = {
  schemaName: string;
  manifest: unknown | null;
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
