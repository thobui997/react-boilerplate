const DEFAULT_API_BASE = '/api/v1'

// Đọc biến bắt buộc; thiếu hoặc rỗng thì ném lỗi nêu rõ tên biến để lỗi cấu hình lộ ra ngay lúc khởi động.
export function requireEnv(
  name: string,
  source: Record<string, string | undefined> = import.meta.env,
): string {
  const value = source[name]
  if (!value) throw new Error(`Thiếu biến môi trường ${name} (xem .env.example).`)
  return value
}

export const env: { apiBase: string } = {
  apiBase: import.meta.env.VITE_API_BASE || DEFAULT_API_BASE,
}
