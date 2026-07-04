export type ErrorInfo = {
  code: string;
  message: string;
};

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: ErrorInfo };

export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export function fail<T = never>(code: string, message: string): Result<T> {
  return { success: false, error: { code, message } };
}
