export type ErrorInfo = {
  code: string;
  message: string;
  /** 解決の手掛かり（Postgres の HINT 等）。無ければ undefined。 */
  hint?: string;
};

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: ErrorInfo };

export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export function fail<T = never>(code: string, message: string, hint?: string): Result<T> {
  return { success: false, error: { code, message, hint } };
}
