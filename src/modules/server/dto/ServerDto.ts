// バックエンドの ServerSummaryDto に対応する（rv_meta.openapi_servers 1行）。
export type ServerDto = {
  id: number;
  name: string;
  environment: string;
  baseUrl: string;
  description: string | null;
  variables: Record<string, unknown> | null;
  healthPath: string | null;
  expectedStatus: number;
  timeoutMs: number;
  enabled: boolean;
  /** 監査列（ISO8601 UTC 文字列）。 */
  createdAt: string;
  updatedAt: string;
};

// フォーム編集中の下書き。variables は JSON テキストとして編集する。
export type ServerDraft = {
  id: number | null;
  name: string;
  environment: string;
  baseUrl: string;
  description: string;
  variablesText: string;
  healthPath: string;
  expectedStatus: number;
  timeoutMs: number;
  enabled: boolean;
};

// save_server コマンドへ渡す入力。id 未指定なら新規。
export type SaveServerInput = {
  id?: number;
  name: string;
  environment: string;
  baseUrl: string;
  description?: string;
  variables?: unknown;
  healthPath?: string;
  expectedStatus: number;
  timeoutMs: number;
  enabled: boolean;
};

// test_server コマンドへ渡す入力。
export type TestServerInput = {
  baseUrl: string;
  variables?: unknown;
  healthPath?: string;
  expectedStatus: number;
  timeoutMs: number;
};

// test_server コマンドの結果。
export type TestServerResult = {
  isOk: boolean;
  url: string;
  status: number | null;
  expectedStatus: number;
  latencyMs: number | null;
  message: string;
};
