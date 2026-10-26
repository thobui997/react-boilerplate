import { useQueryClient } from '@tanstack/react-query'
import { broadcastSignOut, getAuthAdapter, http, tokenStore } from '@/shared/api'

// Mạng chậm không được giữ người dùng lại màn hình quá lâu: bỏ chờ rồi vẫn đăng xuất cục bộ.
export const SERVER_LOGOUT_WAIT_MS = 4_000

export function useSignOut(): () => Promise<void> {
  const queryClient = useQueryClient()

  return async () => {
    // Phải gọi trước khi xoá token: request đăng xuất cần Bearer. Adapter không có refresh nhận `null`.
    if (tokenStore.hasSession()) {
      const refreshToken = tokenStore.getRefresh()
      let timer: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<void>((resolve) => {
        timer = setTimeout(resolve, SERVER_LOGOUT_WAIT_MS)
      })
      // Lỗi (mất mạng, 401, 5xx) không được chặn đăng xuất cục bộ.
      const logout = Promise.resolve()
        .then(() => getAuthAdapter().logout(http, refreshToken))
        .catch(() => undefined)
      await Promise.race([logout, timeout])
      clearTimeout(timer)
    }

    tokenStore.clear()
    queryClient.clear()
    broadcastSignOut()
  }
}
