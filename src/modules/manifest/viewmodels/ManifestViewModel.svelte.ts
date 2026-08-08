import {
  bindKindOf,
  buildBindRule,
  newOperation,
  newRoute,
  parametersFromPath,
  type BindKind,
  type ManifestService
} from '@/modules/manifest/services/ManifestService';
import {
  applyOverride,
  defaultsFields as buildDefaultsFields,
  operationFields as buildOperationFields,
  profileFields as buildProfileFields,
  routeFields as buildRouteFields,
  toDeclared
} from '@/modules/manifest/services/EffectiveField';
import type {
  EffectiveField,
  ManifestField,
  OverrideScope
} from '@/modules/manifest/types/ManifestField';
import {
  PROFILE_NAMES,
  type BindRule,
  type CoverageState,
  type HttpMethod,
  type ManifestArgument,
  type ManifestCoverage,
  type ManifestDefaults,
  type ManifestDiagnostic,
  type ManifestDocument,
  type ManifestFunction,
  type ManifestOperation,
  type ManifestOverview,
  type ManifestProfile,
  type ProfileName,
  type PublicRoute,
  type StoredManifest
} from '@/modules/manifest/types/Manifest';

/** 一覧行に出す、スキーマ 1 件分の宣言の埋まり具合。 */
export type CoverageCounts = { declared: number; undeclared: number; orphaned: number };

export type ManifestViewModelState = {
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  schemaName: string | null;
  stored: StoredManifest | null;
  /** 編集中の宣言。読み込み時に stored（無ければ空）から起こす。 */
  draft: ManifestDocument | null;
  coverage: ManifestCoverage[];
  functions: ManifestFunction[];
  diagnostics: ManifestDiagnostic[];
  /** 一覧用。スキーマ名 → 件数。 */
  coverageBySchema: Record<string, CoverageCounts>;
  overviews: ManifestOverview[];
  /** 宣言できる項目の定義。rv_meta.manifest_fields() が原本。 */
  fields: ManifestField[];
  /**
   * 「カタログから起こす」の進行。押しても何も起きないように見える状態を作らないため、
   * 実行前に何が増えるかを持ち、実行後は結果を持つ。
   */
  draftTask: {
    state: 'idle' | 'confirm' | 'running' | 'done' | 'error';
    schemas: string[];
    plan: string[];
    result: string[];
    progress: number;
  };
  /**
   * 全スキーマの公開関数。一覧を横断させるために持つ。
   * 編集は 1 スキーマずつなので、行を開いたときに load() で切り替える。
   */
  catalog: OperationRow[];
};

/** オペレーション一覧の 1 行。スキーマを跨いで並べる。 */
export type OperationRow = {
  schemaName: string;
  functionKey: string;
  operationId: string | null;
  state: CoverageState;
  declared: boolean;
  routeCount: number;
  description: string;
};

export class ManifestViewModel {
  state: ManifestViewModelState = $state({
    isLoading: false,
    isSaving: false,
    errorMessage: null,
    schemaName: null,
    stored: null,
    draft: null,
    coverage: [],
    functions: [],
    diagnostics: [],
    coverageBySchema: {},
    overviews: [],
    fields: [],
    catalog: [],
    draftTask: { state: 'idle', schemas: [], plan: [], result: [], progress: 0 }
  });

  constructor(private readonly manifestService: ManifestService) {}

  get blockingCount(): number {
    return this.state.diagnostics.filter((d) => d.severity === 'error').length;
  }

  get warningCount(): number {
    return this.state.diagnostics.filter((d) => d.severity === 'warning').length;
  }

  get undeclaredCount(): number {
    return this.state.coverage.filter((c) => c.state === 'undeclared').length;
  }

  get orphanedCount(): number {
    return this.state.coverage.filter((c) => c.state === 'orphaned').length;
  }

  /** 保存していない編集があるか。あるなら閉じる前に気づかせる。 */
  get isDirty(): boolean {
    if (!this.state.draft) return false;
    return JSON.stringify(this.state.draft) !== JSON.stringify(this.state.stored?.manifest ?? null);
  }

  get operationKeys(): string[] {
    return Object.keys(this.state.draft?.operations ?? {}).sort();
  }

  functionOf(functionKey: string): ManifestFunction | undefined {
    return this.state.functions.find((f) => f.functionKey === functionKey);
  }

  argumentsOf(functionKey: string): ManifestArgument[] {
    return this.functionOf(functionKey)?.arguments ?? [];
  }

  operationOf(functionKey: string): ManifestOperation | undefined {
    return this.state.draft?.operations?.[functionKey];
  }

  routesOf(functionKey: string): PublicRoute[] {
    return this.operationOf(functionKey)?.publicRoutes ?? [];
  }

  stateOf(functionKey: string): CoverageState {
    return this.state.coverage.find((c) => c.functionKey === functionKey)?.state ?? 'undeclared';
  }

  /**
   * 一覧の行をまとめて作る。
   * 1 件失敗しても他は出す。一覧が丸ごと空になるより、引けた分を見せるほうが役に立つ。
   */
  async loadOverviews(schemas: { name: string; comment: string | null }[]): Promise<void> {
    const rows = await Promise.all(
      schemas.map(async (schema) => {
        const [stored, coverage, diagnostics] = await Promise.all([
          this.manifestService.loadManifest(schema.name),
          this.manifestService.loadCoverage(schema.name),
          this.manifestService.loadDiagnostics(schema.name)
        ]);
        const manifest = stored.success ? stored.data.manifest : null;
        const operations = manifest?.operations ?? {};
        const diagnosticList = diagnostics.success ? diagnostics.data : [];
        const coverageList = coverage.success ? coverage.data : [];
        const overview: ManifestOverview = {
          schemaName: schema.name,
          comment: schema.comment,
          hasManifest: manifest != null,
          profiles: PROFILE_NAMES.filter((name) => manifest?.profiles?.[name] != null),
          operationCount: Object.keys(operations).length,
          publicRouteCount: Object.values(operations).reduce(
            (total, operation) => total + (operation.publicRoutes?.length ?? 0),
            0
          ),
          undeclaredCount: coverageList.filter((c) => c.state === 'undeclared').length,
          errorCount: diagnosticList.filter((d) => d.severity === 'error').length,
          warningCount: diagnosticList.filter((d) => d.severity === 'warning').length
        };
        const counts: CoverageCounts = { declared: 0, undeclared: 0, orphaned: 0 };
        for (const row of coverageList) counts[row.state] += 1;
        return { overview, counts };
      })
    );

    this.state.overviews = rows.map((row) => row.overview);
    this.state.coverageBySchema = Object.fromEntries(
      rows.map((row) => [row.overview.schemaName, row.counts])
    );
  }

  /**
   * 全スキーマの公開関数を 1 本の一覧にする。
   *
   * スキーマを選ぶドロップダウンを置かず、絞り込みは検索窓に任せるため、
   * 行はスキーマを跨いで並べる。他スキーマの同種の宣言と見比べられる。
   */
  async loadCatalog(schemaNames: string[]): Promise<void> {
    const rows = await Promise.all(
      schemaNames.map(async (schemaName) => {
        const [functions, stored] = await Promise.all([
          this.manifestService.loadFunctions(schemaName),
          this.manifestService.loadManifest(schemaName)
        ]);
        if (!functions.success) return [];
        const operations = (stored.success ? stored.data.manifest?.operations : undefined) ?? {};
        return functions.data.map((fn) => {
          const operation = operations[fn.functionKey];
          return {
            schemaName,
            functionKey: fn.functionKey,
            operationId: operation?.operationId ?? null,
            state: fn.state,
            declared: operation != null,
            routeCount: operation?.publicRoutes?.length ?? 0,
            // 説明は宣言が原本だが、無ければ関数の COMMENT。空欄を並べても読めない。
            description: operation?.description ?? fn.comment ?? ''
          } satisfies OperationRow;
        });
      })
    );
    this.state.catalog = rows.flat();
  }

  /** 一覧行の件数だけを引き直す。中身は開いたときに読む。 */
  async loadCoverageFor(schemaNames: string[]): Promise<void> {
    const next: Record<string, CoverageCounts> = {};
    for (const name of schemaNames) {
      const result = await this.manifestService.loadCoverage(name);
      if (!result.success) continue;
      const counts: CoverageCounts = { declared: 0, undeclared: 0, orphaned: 0 };
      for (const row of result.data) counts[row.state] += 1;
      next[name] = counts;
    }
    this.state.coverageBySchema = next;
  }

  /**
   * 「カタログから起こす」の確認。何件増えるかを先に示す。
   *
   * 宣言が既に揃っているスキーマでは中身が変わらない。実行しても表示が変わらないのは
   * 正しい挙動なので、押す前にそう伝える。押しても無反応に見える状態を作らない。
   */
  askDraft(schemaNames: string[]): void {
    if (schemaNames.length === 0) return;
    const plan: string[] = [];
    for (const name of schemaNames) {
      const counts = this.state.coverageBySchema[name];
      const overview = this.state.overviews.find((row) => row.schemaName === name);
      const adding = counts?.undeclared ?? 0;
      if (!overview?.hasManifest) plan.push(`${name} — 新規に作る`);
      else if (adding > 0) plan.push(`${name} — ${adding} 件の宣言を足す`);
    }
    this.state.draftTask = { state: 'confirm', schemas: schemaNames, plan, result: [], progress: 0 };
  }

  /**
   * 選択したスキーマの骨子をまとめて起こして保存する。
   *
   * 起こしただけでは DB に入らないので一覧の状態が変わらず、押した意味が見えない。
   * draft_manifest は既存の宣言を書き換えない（足すだけ）ので、保存まで進めてよい。
   */
  async runDraft(): Promise<void> {
    const schemaNames = this.state.draftTask.schemas;
    this.state.draftTask = { ...this.state.draftTask, state: 'running', progress: 0 };
    this.state.errorMessage = null;
    const result: string[] = [];

    for (const [index, name] of schemaNames.entries()) {
      const before = this.state.overviews.find((row) => row.schemaName === name)?.operationCount ?? 0;
      const drafted = await this.manifestService.draftManifest(name);
      if (!drafted.success) {
        this.state.errorMessage = drafted.error.message;
        this.state.draftTask = { ...this.state.draftTask, state: 'error' };
        return;
      }
      const saved = await this.manifestService.saveManifest(name, drafted.data);
      if (!saved.success) {
        this.state.errorMessage = saved.error.message;
        this.state.draftTask = { ...this.state.draftTask, state: 'error' };
        return;
      }
      const after = Object.keys(drafted.data.operations ?? {}).length;
      if (after !== before) result.push(`${name} — 宣言 ${before} → ${after}`);
      this.state.draftTask = {
        ...this.state.draftTask,
        progress: Math.round(((index + 1) / schemaNames.length) * 100)
      };
    }

    this.state.draftTask = { ...this.state.draftTask, state: 'done', result, progress: 100 };
  }

  closeDraftTask(): void {
    this.state.draftTask = { state: 'idle', schemas: [], plan: [], result: [], progress: 0 };
  }

  /** 確認を挟まずに起こす。確認済みの経路とテストから使う。 */
  async draftMany(schemaNames: string[]): Promise<void> {
    this.state.draftTask = { state: 'confirm', schemas: schemaNames, plan: [], result: [], progress: 0 };
    await this.runDraft();
    this.closeDraftTask();
  }

  /**
   * 項目定義を読む。スキーマに依存しないので 1 度だけ。
   * これが無いと編集画面は何も描けないので、失敗は握り潰さない。
   */
  async loadFields(): Promise<void> {
    if (this.state.fields.length > 0) return;
    const result = await this.manifestService.loadFields();
    if (result.success) this.state.fields = result.data;
    else this.state.errorMessage = result.error.message;
  }

  // ────────────────────────────── 有効値（値 + 由来）

  private context(profile: ProfileName, functionKey?: string) {
    return {
      manifest: this.requireDraft(),
      profile,
      functionKey,
      fn: functionKey ? this.functionOf(functionKey) : undefined,
      schemaName: this.state.schemaName ?? ''
    };
  }

  operationFields(functionKey: string, profile: ProfileName): EffectiveField[] {
    return buildOperationFields(
      this.state.fields,
      this.context(profile, functionKey),
      this.operationOf(functionKey)
    );
  }

  profileFields(profile: ProfileName): EffectiveField[] {
    return buildProfileFields(this.state.fields, this.context(profile));
  }

  defaultsFields(profile: ProfileName): EffectiveField[] {
    return buildDefaultsFields(this.state.fields, this.context(profile));
  }

  routeFieldsOf(functionKey: string, index: number, profile: ProfileName): EffectiveField[] {
    const route = this.routesOf(functionKey)[index];
    if (!route) return [];
    return buildRouteFields(
      this.state.fields,
      this.context(profile, functionKey),
      this.operationOf(functionKey),
      route,
      this.argumentsOf(functionKey)
    );
  }

  /**
   * 上書きする。適用範囲をその場で選ばせるので、人は defaults と
   * profiles.<profile>.defaults の階層を先に理解しなくてよい。
   */
  override(
    field: ManifestField,
    input: string,
    scope: OverrideScope,
    profile: ProfileName,
    functionKey: string | null
  ): void {
    applyOverride(
      this.requireDraft(),
      scope,
      profile,
      functionKey,
      field,
      toDeclared(input, field)
    );
  }

  /** 上書きを外して継承・推論へ戻す。 */
  clearOverride(field: ManifestField, profile: ProfileName, functionKey: string | null): void {
    applyOverride(this.requireDraft(), 'own', profile, functionKey, field, undefined);
  }

  /** 選んだ operation へ同じ値をまとめて書く。1500 件を 1 件ずつ開かせない。 */
  overrideMany(
    functionKeys: string[],
    field: ManifestField,
    input: string,
    scope: OverrideScope,
    profile: ProfileName
  ): void {
    if (scope !== 'own') {
      this.override(field, input, scope, profile, null);
      return;
    }
    for (const key of functionKeys) this.override(field, input, 'own', profile, key);
  }

  async load(schemaName: string): Promise<void> {
    this.state.isLoading = true;
    this.state.errorMessage = null;
    this.state.schemaName = schemaName;

    await this.loadFields();
    const [stored, coverage, diagnostics, functions] = await Promise.all([
      this.manifestService.loadManifest(schemaName),
      this.manifestService.loadCoverage(schemaName),
      this.manifestService.loadDiagnostics(schemaName),
      this.manifestService.loadFunctions(schemaName)
    ]);

    // manifest が未登録でも coverage は引ける。診断だけが失敗しても
    // 「何が宣言されているか」は見せたいので、それぞれ独立に扱う。
    if (stored.success) this.state.stored = stored.data;
    else this.state.errorMessage = stored.error.message;

    this.state.coverage = coverage.success ? coverage.data : [];
    this.state.diagnostics = diagnostics.success ? diagnostics.data : [];
    this.state.functions = functions.success ? functions.data : [];
    this.state.draft = cloneDocument(this.state.stored?.manifest ?? null, schemaName);
    this.state.isLoading = false;
  }

  /** 編集を捨てて保存済みへ戻す。 */
  revert(): void {
    this.state.draft = cloneDocument(this.state.stored?.manifest ?? null, this.state.schemaName ?? '');
    this.state.errorMessage = null;
  }

  /**
   * カタログから骨子を起こして編集中の宣言へ取り込む。保存はしない。
   * 推測した security（要認証）や tags を、人が確認してから保存する。
   */
  async draft(): Promise<void> {
    const schemaName = this.state.schemaName;
    if (!schemaName) return;
    this.state.isLoading = true;
    const result = await this.manifestService.draftManifest(schemaName);
    if (result.success) this.state.draft = cloneDocument(result.data, schemaName);
    else this.state.errorMessage = result.error.message;
    this.state.isLoading = false;
  }

  // ────────────────────────────── 編集（profiles / defaults）

  profileOf(profile: ProfileName): ManifestProfile | undefined {
    return this.state.draft?.profiles?.[profile];
  }

  /**
   * profile を足す。
   *
   * bff は既定を入れて足す。外へ出す契約では引数の p_ を落とし、テーブル CRUD は出さない
   * （publicRoutes で宣言したものだけを公開する）という判断がほぼ常に同じだからで、
   * 空で作らせると人が毎回同じ 2 項目を埋めることになる。
   * postgrest は空で足す。未宣言のキーは DB 側が推論するので、書くほど食い違う余地が増える。
   */
  addProfile(profile: ProfileName): void {
    const draft = this.requireDraft();
    draft.profiles = draft.profiles ?? {};
    if (draft.profiles[profile]) return;
    draft.profiles[profile] =
      profile === 'bff'
        ? { generationMode: 'function_only', naming: { stripPrefix: { arg: 'p_' } } }
        : {};
  }

  removeProfile(profile: ProfileName): void {
    const draft = this.state.draft;
    if (draft?.profiles) delete draft.profiles[profile];
  }

  setProfileField(profile: ProfileName, field: keyof ManifestProfile, value: string): void {
    const draft = this.requireDraft();
    draft.profiles = draft.profiles ?? {};
    const target = (draft.profiles[profile] = draft.profiles[profile] ?? {});
    // 空文字は「未宣言」。既定の推論を働かせたいので、キーごと消す。
    if (value.trim().length === 0) delete target[field];
    else (target[field] as string) = value;
  }

  setStripPrefixArg(profile: ProfileName, value: string): void {
    const draft = this.requireDraft();
    draft.profiles = draft.profiles ?? {};
    const target = (draft.profiles[profile] = draft.profiles[profile] ?? {});
    if (value.trim().length === 0) {
      if (target.naming?.stripPrefix) delete target.naming.stripPrefix.arg;
      return;
    }
    target.naming = target.naming ?? {};
    target.naming.stripPrefix = target.naming.stripPrefix ?? {};
    target.naming.stripPrefix.arg = value;
  }

  setDefault(field: keyof ManifestDefaults, value: unknown): void {
    const draft = this.requireDraft();
    draft.defaults = draft.defaults ?? {};
    if (value === undefined || value === null || value === '') delete draft.defaults[field];
    else (draft.defaults[field] as unknown) = value;
  }

  // ────────────────────────────── 編集（operation）

  /** 宣言の無い関数に宣言を足す。既定は draft_manifest と揃える。 */
  declareOperation(functionKey: string): void {
    const draft = this.requireDraft();
    draft.operations = draft.operations ?? {};
    if (draft.operations[functionKey]) return;
    const group = draft.defaults?.operationGroup ?? defaultGroup(this.state.schemaName ?? '');
    draft.operations[functionKey] = newOperation(functionKey, this.functionOf(functionKey), group);
  }

  /** 宣言を外す。関数は残るが既定拒否で非公開になる。 */
  undeclareOperation(functionKey: string): void {
    const operations = this.state.draft?.operations;
    if (operations) delete operations[functionKey];
  }

  setOperationField<K extends keyof ManifestOperation>(
    functionKey: string,
    field: K,
    value: ManifestOperation[K]
  ): void {
    const operation = this.state.draft?.operations?.[functionKey];
    if (!operation) return;
    if (value === undefined || value === '') delete operation[field];
    else operation[field] = value;
  }

  // ────────────────────────────── 編集（publicRoutes）

  /** BFF で公開する。ルートが 1 本も無いと bff ドキュメントに出ない。 */
  publish(functionKey: string, method: HttpMethod = 'POST'): void {
    const operation = this.state.draft?.operations?.[functionKey];
    if (!operation) return;
    operation.publicRoutes = operation.publicRoutes ?? [];
    operation.publicRoutes.push(
      newRoute(functionKey, operation, this.argumentsOf(functionKey), method)
    );
  }

  /** 公開をやめる。publicRoutes ごと落とす（既定拒否へ戻す）。 */
  unpublish(functionKey: string): void {
    const operation = this.state.draft?.operations?.[functionKey];
    if (operation) delete operation.publicRoutes;
  }

  removeRoute(functionKey: string, index: number): void {
    const operation = this.state.draft?.operations?.[functionKey];
    if (!operation?.publicRoutes) return;
    operation.publicRoutes.splice(index, 1);
    if (operation.publicRoutes.length === 0) delete operation.publicRoutes;
  }

  duplicateRoute(functionKey: string, index: number): void {
    const operation = this.state.draft?.operations?.[functionKey];
    const route = operation?.publicRoutes?.[index];
    if (!operation?.publicRoutes || !route) return;
    const copy: PublicRoute = JSON.parse(JSON.stringify(route));
    copy.operationId = `${route.operationId ?? 'route'}Copy`;
    operation.publicRoutes.splice(index + 1, 0, copy);
  }

  setRouteField<K extends keyof PublicRoute>(
    functionKey: string,
    index: number,
    field: K,
    value: PublicRoute[K]
  ): void {
    const route = this.state.draft?.operations?.[functionKey]?.publicRoutes?.[index];
    if (!route) return;
    if (value === undefined || value === '') delete route[field];
    else route[field] = value;

    // path を変えたら parameters(in=path) を作り直す。
    // 二重に書かせると path_parameters_mismatch を人が踏むだけで、判断の余地はない。
    if (field === 'path') route.parameters = parametersFromPath(String(value ?? ''));
  }

  bindKind(functionKey: string, index: number, argument: string): BindKind {
    return bindKindOf(this.bindRule(functionKey, index, argument));
  }

  bindRule(functionKey: string, index: number, argument: string): BindRule | undefined {
    return this.state.draft?.operations?.[functionKey]?.publicRoutes?.[index]?.bind?.[argument];
  }

  setBind(
    functionKey: string,
    index: number,
    argument: string,
    kind: BindKind,
    value: string
  ): void {
    const route = this.state.draft?.operations?.[functionKey]?.publicRoutes?.[index];
    if (!route) return;
    route.bind = route.bind ?? {};
    const rule = buildBindRule(kind, value);
    if (!rule) delete route.bind[argument];
    else route.bind[argument] = rule;
  }

  // ────────────────────────────── 保存

  /** 検証に落ちたら保存されない。診断を引き直して原因を出す。 */
  async save(): Promise<boolean> {
    const schemaName = this.state.schemaName;
    const manifest = this.state.draft;
    if (!schemaName || manifest == null) return false;

    this.state.isSaving = true;
    this.state.errorMessage = null;
    const result = await this.manifestService.saveManifest(schemaName, manifest);
    this.state.isSaving = false;

    if (!result.success) {
      this.state.errorMessage = result.error.message;
      const diagnostics = await this.manifestService.loadDiagnostics(schemaName);
      if (diagnostics.success) this.state.diagnostics = diagnostics.data;
      return false;
    }
    await this.load(schemaName);
    return true;
  }

  private requireDraft(): ManifestDocument {
    if (!this.state.draft) {
      this.state.draft = cloneDocument(null, this.state.schemaName ?? '');
    }
    return this.state.draft;
  }
}

/**
 * 編集用の写しを作る。
 *
 * 保存済みをそのまま編集すると、破棄したいときに戻せない。
 * 未登録なら、postgrest だけを持つ空の宣言から始める（draft_manifest の既定と同じ）。
 */
function cloneDocument(source: ManifestDocument | null, schemaName: string): ManifestDocument {
  if (source) return JSON.parse(JSON.stringify(source)) as ManifestDocument;
  return { schema: schemaName, profiles: { postgrest: {} }, operations: {} };
}

/** operationGroup / tags の既定。スキーマ名から起こす（_draft_manifest と同じ考え方）。 */
function defaultGroup(schemaName: string): string {
  return schemaName
    .split(/[_-]/)
    .filter((part) => part.length > 0)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}
