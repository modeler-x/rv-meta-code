import type { IManifestRepository } from '@/modules/manifest/repositories/ManifestRepository';
import {
  BEARER_SECURITY,
  type BindRule,
  type HttpMethod,
  type ManifestArgument,
  type ManifestCoverage,
  type ManifestDiagnostic,
  type ManifestDocument,
  type ManifestFunction,
  type ManifestOperation,
  type PublicRoute,
  type RouteParameter,
  type StoredManifest,
  type SyncState
} from '@/modules/manifest/types/Manifest';
import type { ManifestField } from '@/modules/manifest/types/ManifestField';
import type { Result } from '@/shared/result/Result';

export class ManifestService {
  constructor(private readonly manifestRepository: IManifestRepository) {}

  /** 宣言できる項目の定義。画面はこれを描き、項目一覧を持たない。 */
  async loadFields(): Promise<Result<ManifestField[]>> {
    return this.manifestRepository.fields();
  }

  async loadCoverage(schemaName: string): Promise<Result<ManifestCoverage[]>> {
    return this.manifestRepository.coverage(schemaName);
  }

  async loadFunctions(schemaName: string): Promise<Result<ManifestFunction[]>> {
    return this.manifestRepository.functions(schemaName);
  }

  async loadDiagnostics(schemaName: string): Promise<Result<ManifestDiagnostic[]>> {
    return this.manifestRepository.diagnose(schemaName);
  }

  async loadManifest(schemaName: string): Promise<Result<StoredManifest>> {
    return this.manifestRepository.get(schemaName);
  }

  /**
   * カタログから骨子を起こす。初版かどうかは区別しない。
   * 既存の宣言はサーバー側でマージされるので、人の編集は消えない。
   */
  async draftManifest(schemaName: string): Promise<Result<ManifestDocument>> {
    return this.manifestRepository.draft(schemaName);
  }

  /** 検証を通ったときだけ保存される。 */
  async saveManifest(schemaName: string, manifest: ManifestDocument): Promise<Result<unknown>> {
    return this.manifestRepository.load(schemaName, manifest);
  }
}

/**
 * 原本（リポジトリの manifest.sql）と下書き（DB）の一致状態。
 *
 * 下書きが消えるのは事故ではなく仕様で、リポジトリの適用パスに無いものは
 * mox init のたびに失われる。書き出す前に気づけるようにここで状態を出す。
 */
export function syncState(fileDigest: string | null, dbDigest: string | null): SyncState {
  if (!fileDigest && !dbDigest) return 'none';
  if (!fileDigest) return 'draft-only';
  if (!dbDigest) return 'file-ahead';
  return fileDigest === dbDigest ? 'synced' : 'draft-only';
}

/** error が 1 件でもあれば compile が止まる。 */
export function blocking(diagnostics: ManifestDiagnostic[]): ManifestDiagnostic[] {
  return diagnostics.filter((d) => d.severity === 'error');
}

/** その operation に紐づく診断。location の前方一致で拾う。 */
export function diagnosticsOf(
  diagnostics: ManifestDiagnostic[],
  functionKey: string
): ManifestDiagnostic[] {
  const prefix = `operations."${functionKey}"`;
  return diagnostics.filter((d) => d.location.startsWith(prefix) || d.location === functionKey);
}

/** 診断の location から関数キーを取り出す。取れなければ null（スキーマ全体の指摘）。 */
export function functionKeyOf(location: string): string | null {
  const matched = /^operations\."([^"]+)"/.exec(location);
  return matched ? matched[1] : null;
}

/** 関数キー "name(args)" の name 部分。operationId の推測に使う。 */
export function functionNameOf(functionKey: string): string {
  const index = functionKey.indexOf('(');
  return index < 0 ? functionKey : functionKey.slice(0, index);
}

/** snake_case → camelCase。DB 側 _infer_camel_case と同じ規則にする。 */
export function toCamelCase(name: string): string {
  const parts = name.split('_').filter((part) => part.length > 0);
  if (parts.length === 0) return name;
  return parts[0] + parts.slice(1).map((p) => p[0].toUpperCase() + p.slice(1)).join('');
}

/**
 * path の {param} から parameters(in=path) を組み立てる。
 *
 * 宣言が食い違うと path_parameters_mismatch で compile が止まるが、
 * これは path を見れば決まることなので、人に二度書かせない。
 */
export function parametersFromPath(path: string): RouteParameter[] {
  const names = [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
  return names.map((name) => ({
    name,
    in: 'path' as const,
    required: true as const,
    schema: { type: 'string' }
  }));
}

export type BindKind = 'body' | 'path' | 'const' | 'unbound';

export function bindKindOf(rule: BindRule | undefined): BindKind {
  if (!rule) return 'unbound';
  if (rule.const !== undefined) return 'const';
  if (rule.from === 'body' || rule.from === 'path') return rule.from;
  return 'unbound';
}

export function bindValueOf(rule: BindRule | undefined): string {
  if (!rule) return '';
  if (rule.const !== undefined) return String(rule.const);
  return rule.name ?? '';
}

export function buildBindRule(kind: BindKind, value: string): BindRule | undefined {
  if (kind === 'unbound') return undefined;
  if (kind === 'const') return { const: value };
  return value.trim().length > 0 ? { from: kind, name: value.trim() } : { from: kind };
}

/**
 * 新しいルートの初期値。
 *
 * DEFAULT を持たない引数は必ず bind が要る（bind_missing_argument）ので、
 * 既定で body に置く。path 引数へ変えるのは人の判断だが、
 * 空のまま保存して落ちるより、埋まった状態から直すほうが速い。
 */
export function newRoute(
  functionKey: string,
  operation: ManifestOperation,
  args: ManifestArgument[],
  method: HttpMethod = 'POST'
): PublicRoute {
  const bind: Record<string, BindRule> = {};
  for (const argument of args) {
    if (argument.required) bind[argument.name] = { from: 'body' };
  }
  return {
    operationId: operation.operationId ?? toCamelCase(functionNameOf(functionKey)),
    method,
    path: '/',
    parameters: [],
    bind
  };
}

/**
 * 宣言が無い関数の初期値。draft_manifest と同じ既定を UI 側でも使う。
 * security は要認証（書き忘れが公開にならないよう fail-closed）。
 */
export function newOperation(
  functionKey: string,
  fn: ManifestFunction | undefined,
  group: string
): ManifestOperation {
  const operation: ManifestOperation = {
    operationId: toCamelCase(functionNameOf(functionKey)),
    operationGroup: group,
    tags: [group],
    security: [...BEARER_SECURITY]
  };
  const comment = fn?.comment?.trim();
  if (comment) operation.description = comment;
  return operation;
}
