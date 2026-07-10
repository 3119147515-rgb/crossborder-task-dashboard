export function withSupabaseTimeout<T>(request: PromiseLike<T>, label = "Supabase 请求", timeoutMs = 15000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label}超时，请检查网络或 Supabase 连接后重试。`));
    }, timeoutMs);
  });

  return Promise.race([Promise.resolve(request), timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}
