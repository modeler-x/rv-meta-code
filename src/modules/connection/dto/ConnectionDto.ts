// バックエンドの ConnectionSummaryDto に対応する。password は秘匿のため含まれない。
export type ConnectionDto = {
  id: string;
  name: string;
  host: string;
  port: string;
  database: string;
  user: string;
  isCurrent: boolean;
  hasPassword: boolean;
  excludedSchemas?: string[];
};

// フォーム編集中の下書き。password はこの端末で暗号化保存される秘匿値。
export type ConnectionDraft = {
  id: string;
  name: string;
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
  isCurrent: boolean;
  hasPassword: boolean;
  excludedSchemas: string[];
};

// save_connection コマンドへ渡す入力。id 未指定なら新規、password 未指定なら現状維持。
export type SaveConnectionInput = {
  id?: string;
  name: string;
  host: string;
  port: string;
  database: string;
  user: string;
  password?: string;
  excludedSchemas?: string[];
};

// test_connection コマンドへ渡す入力。
export type TestConnectionInput = {
  id?: string;
  host: string;
  port: string;
  database: string;
  user: string;
  password?: string;
};

// test_connection コマンドの結果。
export type TestConnectionResult = {
  isOk: boolean;
  message: string;
  serverVersion: string | null;
};

// get_current_connection コマンドの結果（ヘッダ表示用）。未接続なら null。
export type CurrentConnectionDto = {
  name: string;
  database: string;
  host: string;
};
