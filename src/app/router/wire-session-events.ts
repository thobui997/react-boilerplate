import type { QueryClient } from '@tanstack/react-query'
import type { DataRouter } from 'react-router'
import { sessionQueries } from '@/entities/session'
import { onPasswordChangeRequired, onRemoteSignOut, onSessionExpired } from '@/shared/api'
import { ROUTES } from '@/shared/config'
import { messages } from '@/shared/i18n'
import { FORCED_NAVIGATION_STATE } from '@/shared/lib/hooks'
import { notify } from '@/shared/lib/notify'

// shared/api không import app: nó chỉ phát sự kiện, ở đây (app) đổi sự kiện thành điều hướng.
// Điều hướng mang FORCED_NAVIGATION_STATE để hộp xác nhận rời trang (useLeaveConfirm) không chặn.
export function wireSessionEvents(router: DataRouter, queryClient: QueryClient): () => void {
  const isAt = (path: string) => router.state.location.pathname === path

  const goToLogin = (withNext: boolean) => {
    // Phiên đã mất: huỷ truy vấn đang chạy và bỏ dữ liệu của người dùng cũ.
    void queryClient.cancelQueries()
    queryClient.clear()
    if (isAt(ROUTES.Login)) return
    const { pathname, search } = router.state.location
    const target = `${pathname}${search}`
    const next = withNext && target !== ROUTES.Home ? `?next=${encodeURIComponent(target)}` : ''
    void router.navigate(`${ROUTES.Login}${next}`, {
      replace: true,
      state: FORCED_NAVIGATION_STATE,
    })
  }

  const offExpired = onSessionExpired(() => {
    notify.info(messages.auth.sessionExpired)
    goToLogin(true)
  })
  const offRemoteSignOut = onRemoteSignOut(() => goToLogin(false))
  // Nhiều request 403 song song cùng phát sự kiện: chỉ điều hướng khi chưa ở đó.
  const offPasswordChange = onPasswordChangeRequired(() => {
    // Phiên đang cache nói chưa cần đổi mật khẩu; không sửa thì loader của /change-password đẩy người dùng đi.
    queryClient.setQueryData(sessionQueries.current().queryKey, (user) =>
      user ? { ...user, mustChangePassword: true } : user,
    )
    if (!isAt(ROUTES.ChangePassword))
      void router.navigate(ROUTES.ChangePassword, { replace: true, state: FORCED_NAVIGATION_STATE })
  })

  return () => {
    offExpired()
    offRemoteSignOut()
    offPasswordChange()
  }
}
