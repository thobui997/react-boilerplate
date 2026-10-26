import { messages } from '@/shared/i18n'
import { ApiError } from '../api-error'
import { createHttpClient } from '../create-http-client'
import { ApiErrorCode, HttpStatus } from '../error-codes'
import { getAuthAdapter } from './active-adapter'
import type { AuthTokens } from './auth-adapter'
import { awaitRefreshedAccess, openAuthChannel, postAuthMessage } from './auth-channel'
import { withRefreshLock } from './refresh-lock'
import { expireSession } from './session-events'
import { tokenStore } from './token-store'

// BroadcastChannel là bất đồng bộ: chờ ngắn để nhận access token của tab vừa refresh trước khi tự gọi mạng.
const PEER_TOKEN_GRACE_MS = 500

// Instance riêng không có interceptor xác thực, tránh vòng lặp 401 → refresh → 401.
const refreshClient = createHttpClient()

let inFlight: Promise<string> | null = null

function offlineError(): ApiError {
  return new ApiError({
    status: 0,
    code: ApiErrorCode.NetworkError,
    detail: messages.errors.network,
    isNetwork: true,
  })
}

async function renewSession(startToken: string | null, startedAt: number): Promise<string> {
  const current = tokenStore.getRefresh()
  if (!current)
    throw new ApiError({
      status: HttpStatus.Unauthorized,
      code: ApiErrorCode.SessionMissing,
      detail: messages.errors.sessionMissing,
    })

  // Tab khác đã xoay refresh token trong lúc ta chờ khoá: dùng lại access token của họ, không gọi refresh.
  if (current !== startToken) {
    const peerAccess = await awaitRefreshedAccess(startedAt, PEER_TOKEN_GRACE_MS)
    if (peerAccess) {
      tokenStore.setSession({ accessToken: peerAccess, refreshToken: current })
      return peerAccess
    }
  }

  // Chưa gửi gì đi nên token vẫn nguyên vẹn: giữ phiên và để người dùng thử lại khi có mạng.
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw offlineError()

  // Đọc adapter lúc gọi (không cache) để test đổi được adapter.
  const adapter = getAuthAdapter()
  let tokens: AuthTokens
  try {
    tokens = await adapter.refresh(refreshClient, current)
  } catch (error) {
    // Sau khi đã gửi refresh token đi, token đó có thể đã bị server xoay dù ta không nhận được phản hồi. Gửi lại token cũ
    // sẽ bị coi là tái sử dụng và thu hồi MỌI phiên, nên adapter quyết định lỗi nào nghĩa là token đã tiêu → kết thúc phiên.
    if (error instanceof ApiError && adapter.isRefreshTokenSpent(error)) expireSession()
    throw error
  }
  // Phiên đã bị đăng xuất/đổi trong lúc request bay: không được ghi token mới đè lên (người dùng kế tiếp sẽ thấy phiên cũ).
  if (tokenStore.getRefresh() !== current) {
    throw new ApiError({
      status: HttpStatus.Unauthorized,
      code: ApiErrorCode.SessionChanged,
      detail: messages.errors.sessionChanged,
    })
  }
  // Ghi refresh token mới TRƯỚC khi nhả khoá để tab đứng sau đọc được bản mới.
  tokenStore.setSession(tokens)
  postAuthMessage({ type: 'refreshed', accessToken: tokens.accessToken })
  return tokens.accessToken
}

export function refreshSession(): Promise<string> {
  if (!inFlight) {
    openAuthChannel()
    const startToken = tokenStore.getRefresh()
    const startedAt = Date.now()
    inFlight = withRefreshLock(() => renewSession(startToken, startedAt)).finally(() => {
      inFlight = null
    })
  }
  return inFlight
}
