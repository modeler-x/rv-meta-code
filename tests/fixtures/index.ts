import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * 期待値はここから導出する。スキーマ名も関数名も件数もテストに書かない。
 * DB の中身が変われば tests/fixtures/capture.sh を流し直すだけで、テストはそのまま通る。
 */
export type ManifestArgument = { name: string; type: string; required: boolean };

/** 本番の型と同じ値域にする。緩くすると Repository へ渡せず、テスト側で型を潰すことになる。 */
export type CoverageState = 'declared' | 'undeclared' | 'orphaned';
export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export type ManifestFunction = {
  functionKey: string;
  state: CoverageState;
  comment: string | null;
  arguments: ManifestArgument[];
};

export type PublicRoute = {
  operationId?: string;
  method?: string;
  path?: string;
  bind?: Record<string, { from?: 'body' | 'path'; name?: string; const?: unknown }>;
  [k: string]: unknown;
};

export type Operation = { publicRoutes?: PublicRoute[]; [k: string]: unknown };

export type Manifest = {
  profiles: Record<string, Record<string, unknown>>;
  defaults?: Record<string, unknown>;
  operations: Record<string, Operation>;
};

export type Diagnostic = {
  severity: DiagnosticSeverity;
  location: string;
  code: string;
  message: string;
  hint: string | null;
};

export type OpenApiProfile = {
  schemaName: string;
  profile: string;
  declared: boolean;
  compiled: boolean;
  operations: number;
  operationGroups: number;
  documentHash: string | null;
};

export type OpenApiDocument = {
  id: number;
  schemaName: string;
  profile: string;
  title: string;
  version: string;
  description: string | null;
  updatedAt: string;
};

export type Fixture = {
  list_schemas: {
    schemaName: string;
    comment: string | null;
    tableCount: number;
    viewCount: number;
  }[];
  manifests: Record<string, Manifest>;
  coverage: Record<string, { functionKey: string; state: CoverageState }[]>;
  functions: Record<string, ManifestFunction[]>;
  diagnostics: Record<string, Diagnostic[]>;
  profiles: Record<string, OpenApiProfile[]>;
  documents: OpenApiDocument[];
};

const here = dirname(fileURLToPath(import.meta.url));
export const fixture = JSON.parse(readFileSync(join(here, 'dev.json'), 'utf8')) as Fixture;

export const schemaNames: string[] = fixture.list_schemas.map((s) => s.schemaName);

export function routeCount(manifest: Manifest, key: string): number {
  const routes = manifest.operations[key]?.publicRoutes;
  return Array.isArray(routes) ? routes.length : 0;
}

export function totalRoutes(schema: string): number {
  const manifest = fixture.manifests[schema];
  return Object.keys(manifest.operations).reduce((n, k) => n + routeCount(manifest, k), 0);
}

/** bff ルートを最も多く持つスキーマ。「名前」ではなく「性質」で選ぶ。 */
export function schemaWithMostRoutes(): string {
  return [...schemaNames].sort((a, b) => totalRoutes(b) - totalRoutes(a))[0];
}

/** ルートを 1 本も持たないスキーマ。公開前の状態を確かめるのに使う。 */
export function schemaWithoutRoutes(): string | null {
  return schemaNames.find((name) => totalRoutes(name) === 0) ?? null;
}

/** そのスキーマで最も多くの外部ルートへ展開される operation。 */
export function operationWithMostRoutes(schema: string): { key: string; routes: number } {
  const manifest = fixture.manifests[schema];
  const [key, routes] = Object.keys(manifest.operations)
    .map((k) => [k, routeCount(manifest, k)] as const)
    .sort((a, b) => b[1] - a[1])[0];
  return { key, routes };
}

/** 宣言が無い関数。既定拒否で非公開になっているものを指す。 */
export function undeclaredFunction(schema: string): ManifestFunction | null {
  return fixture.functions[schema]?.find((fn) => fn.state === 'undeclared') ?? null;
}

/** そのスキーマで、宣言が無い関数を持つスキーマ名。 */
export function schemaWithUndeclared(): string | null {
  return schemaNames.find((name) => undeclaredFunction(name) != null) ?? null;
}

export function functionOf(schema: string, key: string): ManifestFunction | undefined {
  return fixture.functions[schema]?.find((fn) => fn.functionKey === key);
}

export function coverageCounts(schema: string): Record<string, number> {
  const counts: Record<string, number> = { declared: 0, undeclared: 0, orphaned: 0 };
  for (const row of fixture.coverage[schema] ?? []) counts[row.state] += 1;
  return counts;
}

export function diagnosticCount(schema: string, severity: string): number {
  return (fixture.diagnostics[schema] ?? []).filter((d) => d.severity === severity).length;
}

/** 診断を持つスキーマ。無ければ null。 */
export function schemaWithDiagnostics(): string | null {
  return schemaNames.find((name) => (fixture.diagnostics[name] ?? []).length > 0) ?? null;
}

/** 診断のうち、operation を指すもの。「この箇所を開く」の導線に使う。 */
export function jumpableDiagnostic(schema: string): Diagnostic | null {
  return (
    (fixture.diagnostics[schema] ?? []).find((d) => /^operations\."([^"]+)"/.test(d.location)) ?? null
  );
}

/** 生成済みの契約面。SDK 生成やドキュメント表示はこの単位で行う。 */
export function compiledProfiles(schema: string): OpenApiProfile[] {
  return (fixture.profiles[schema] ?? []).filter((p) => p.compiled);
}

/** 2 つの契約面を持つスキーマ。profile を混ぜられない導線の確認に使う。 */
export function schemaWithTwoProfiles(): string | null {
  return schemaNames.find((name) => compiledProfiles(name).length > 1) ?? null;
}

export function documentsOf(schema: string): OpenApiDocument[] {
  return fixture.documents.filter((d) => d.schemaName === schema);
}

export function functionKeyOf(location: string): string | null {
  return /^operations\."([^"]+)"/.exec(location)?.[1] ?? null;
}
