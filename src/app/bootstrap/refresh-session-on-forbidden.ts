import { ApiError, ApiErrorCode, HttpStatus } from '@/shared/api'

const DEFAULT_MIN_INTERVAL_MS = 10_000

interface SessionRefresherOptions {
  invalidate: () => Promise<unknown>
  now: () => number
  minIntervalMs?: number
}

// 403 `forbidden` nghĩa là quyền trong phiên đã lệch với máy chủ (vai trò vừa đổi): tải lại người dùng hiện tại để
// giao diện theo kịp. Giới hạn theo mốc `now()` (không timer) để chuỗi 403 liên tiếp không tạo vòng tải lại.
export function createSessionRefresher({
  invalidate,
  now,
  minIntervalMs = DEFAULT_MIN_INTERVAL_MS,
}: SessionRefresherOptions): (error: unknown) => void {
  let lastRefreshAt: number | null = null

  return (error) => {
    if (
      !(error instanceof ApiError) ||
      error.status !== HttpStatus.Forbidden ||
      error.code !== ApiErrorCode.Forbidden
    )
      return
    const at = now()
    if (lastRefreshAt !== null && at - lastRefreshAt < minIntervalMs) return
    lastRefreshAt = at
    // Lỗi tải lại đã hiện ở chính truy vấn phiên; ở đây không cần xử lý thêm.
    invalidate().catch(() => undefined)
  }
}
