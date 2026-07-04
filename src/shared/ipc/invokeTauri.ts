export async function invokeTauri<TResponse>(command: string, args?: Record<string, unknown>): Promise<TResponse> {
  const api = await import('@tauri-apps/api/core');
  return api.invoke<TResponse>(command, args);
}
