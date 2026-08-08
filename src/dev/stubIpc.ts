import fixture from '../../tests/fixtures/dev.json';

/**
 * Tauri IPC を、dev DB から採った実データで差し替える。
 *
 * 用途は 2 つあり、実装を 1 つに保つ。
 *   1. 画面を見るだけの開発（pnpm dev:stub）。DB もビルドも要らずにブラウザで開く
 *   2. E2E（Playwright）。macOS は tauri-driver が使えないので、実アプリを
 *      WebDriver で動かす経路が取れない
 *
 * 応答は tests/fixtures/dev.json（tests/fixtures/capture.sh で採取）。手書きしないのは、
 * 実物と食い違うと画面を通しても意味が無いため。
 *
 * サーバー側の検証は真似ない。ここで検証まで書くと「スタブが通したから正しい」に
 * なってしまう。検証そのものは rv-meta の pgTAP が見る。
 */
export type StubOptions = {
  /** load_manifest を失敗させる。検証に落ちた保存が「保存されていない」と出るか見る。 */
  rejectLoadManifest?: boolean;
  /** 接続テストを失敗させる。 */
  rejectTestConnection?: boolean;
};

type StubWindow = {
  __TAURI_INTERNALS__?: unknown;
  __RV_STUB_OPTIONS__?: StubOptions;
  __RV_STUB_CALLS__?: { command: string; args: unknown }[];
};

type Fixture = typeof fixture;
type FunctionRow = { functionKey: string; comment: string | null };

export function installStubIpc(): void {
  const target = window as unknown as StubWindow;
  const options = target.__RV_STUB_OPTIONS__ ?? {};
  const calls: { command: string; args: unknown }[] = [];
  target.__RV_STUB_CALLS__ = calls;

  const data = fixture as Fixture;
  const schemas = data.list_schemas as { schemaName: string }[];
  const manifests = data.manifests as Record<string, unknown>;
  const coverage = data.coverage as Record<string, unknown[]>;
  const functions = data.functions as Record<string, FunctionRow[]>;
  const diagnostics = data.diagnostics as Record<string, unknown[]>;
  const profiles = data.profiles as Record<string, { profile: string }[]>;
  const documents = data.documents as { schemaName: string; profile: string }[];
  const fields = data.fields as unknown[];

  const connections = [
    {
      id: 'dev-rv',
      name: 'dev-rv',
      host: '127.0.0.1',
      port: '5432',
      database: 'robovill_db',
      user: 'postgres',
      isCurrent: true,
      hasPassword: true,
      excludedSchemas: ['pg_catalog', 'information_schema']
    },
    {
      id: 'stg-rv',
      name: 'stg-rv',
      host: 'stg.internal',
      port: '5432',
      database: 'rv_stg',
      user: 'postgres',
      isCurrent: false,
      hasPassword: true,
      excludedSchemas: []
    }
  ];
  let currentId = 'dev-rv';

  // 保存された manifest はこのセッションの中だけ覚える。
  // 「保存すると一覧の表示が変わる」までを 1 本のシナリオで確かめられるようにする。
  const stored: Record<string, unknown> = JSON.parse(JSON.stringify(manifests));

  const handlers: Record<string, (args: Record<string, unknown>) => unknown> = {
    list_connections: () => connections.map((c) => ({ ...c, isCurrent: c.id === currentId })),
    get_current_connection: () => {
      const found = connections.find((c) => c.id === currentId);
      return found ? { name: found.name, database: found.database, host: found.host } : null;
    },
    set_active_connection: (args) => {
      currentId = String(args.id);
      return null;
    },
    test_connection: () =>
      options.rejectTestConnection
        ? { success: false, message: 'could not connect to server' }
        : { success: true, message: 'ok' },
    save_connection: (args) => args.request,
    delete_connection: () => null,

    list_schemas: () => schemas,
    list_documents: () => documents,
    openapi_profiles: (args) => profiles[String(args.schemaName)] ?? [],
    // profile を省いた呼び出しは失敗させる。既定値を置くと、指定し忘れが
    // 黙って内部契約を配る経路になる。
    get_openapi_specs: (args) => {
      if (!args.profile) throw { message: 'profile is required' };
      return (args.schemas as string[]).map((schemaName) => ({
        schemaName,
        profile: String(args.profile),
        spec: { openapi: '3.1.0', info: { title: schemaName, version: '1.0.0' }, paths: {} }
      }));
    },
    manifest_fields: () => fields,
    manifest_coverage: (args) => coverage[String(args.schemaName)] ?? [],
    manifest_functions: (args) => functions[String(args.schemaName)] ?? [],
    diagnose_manifest: (args) => diagnostics[String(args.schemaName)] ?? [],
    get_manifest: (args) => ({
      schemaName: String(args.schemaName),
      manifest: stored[String(args.schemaName)] ?? null,
      updatedAt: '2026-08-08T00:00:00Z'
    }),
    draft_manifest: (args) => {
      const name = String(args.schemaName);
      // draft は「カタログにあって宣言に無いものを足す」。既存は書き換えない。
      const current = (stored[name] ?? {
        schema: name,
        profiles: { postgrest: {} },
        operations: {}
      }) as { operations: Record<string, unknown>; [k: string]: unknown };
      const operations: Record<string, unknown> = { ...current.operations };
      for (const fn of functions[name] ?? []) {
        if (!operations[fn.functionKey]) {
          operations[fn.functionKey] = {
            operationId: fn.functionKey.split('(')[0],
            security: [{ bearerAuth: [] }],
            tags: [name],
            description: fn.comment ?? undefined
          };
        }
      }
      return { ...current, operations };
    },
    load_manifest: (args) => {
      if (options.rejectLoadManifest) {
        throw { message: `manifest of schema "${String(args.schemaName)}" has 1 error(s)` };
      }
      stored[String(args.schemaName)] = args.manifest;
      return {
        schema: args.schemaName,
        operations: Object.keys((args.manifest as { operations?: object }).operations ?? {}).length
      };
    }
  };

  target.__TAURI_INTERNALS__ = {
    invoke(command: string, args: Record<string, unknown> = {}) {
      calls.push({ command, args });
      const handler = handlers[command];
      // 未定義のコマンドは静かに空を返さない。画面が空で描かれる原因を隠すため。
      if (!handler) return Promise.reject({ message: `stub: ${command} is not stubbed` });
      try {
        return Promise.resolve(handler(args));
      } catch (error) {
        return Promise.reject(error);
      }
    }
  };
}
