// Tauri から返る AppError（{ code, message }）等からユーザー表示用メッセージを取り出す。
// Repository で 3 箇所以上に重複していたため共通化した。
export function toIpcErrorMessage(error: unknown): string {
  const shape = error as { message?: string } | null;
  return shape && typeof shape.message === 'string' ? shape.message : String(error);
}
