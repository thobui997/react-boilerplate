import type { AxiosError, AxiosInstance, AxiosResponse } from 'axios'
import { ApiError } from '../api-error'
import { HttpStatus } from '../error-codes'
import { readProblem } from '../problem-json'
import { getAuthAdapter } from './active-adapter'
import { refreshSession } from './refresh-session'
import { emitPasswordChangeRequired, expireSession } from './session-events'
import { tokenStore } from './token-store'

function bearer(token: string): string {
  return `Bearer ${token}`
}

// Đường dẫn không cần xác thực (đăng nhập, refresh…): không gắn Bearer và 401 không kích hoạt refresh.
// Khớp đúng đường dẫn hoặc theo ranh giới (`/`, `?`, `#`): `/auth/login` không được khớp `/auth/login-history`.
function isUnauthenticatedPath(url: string | undefined): boolean {
  if (!url) return false
  return getAuthAdapter().unauthenticatedPaths.some(
    (path) => url === path || (url.startsWith(path) && '/?#'.includes(url.charAt(path.length))),
  )
}

// Interceptor này chạy trước bộ chuẩn hoá lỗi nên tự dựng ApiError để hỏi adapter.
function problemError(response: AxiosResponse): ApiError {
  return new ApiError({ status: response.status, ...readProblem(response.data, response.status) })
}

async function handleAuthError(client: AxiosInstance, error: AxiosError): Promise<unknown> {
  const { response, config } = error
  if (!response || !config) throw error

  const adapter = getAuthAdapter()

  if (response.status === HttpStatus.Forbidden) {
    if (adapter.forbiddenRequiresPasswordChange(problemError(response))) {
      emitPasswordChangeRequired()
    }
    throw error
  }

  // Đường dẫn không cần Bearer (đăng nhập, refresh…) trả 401 nghĩa là sai thông tin, không phải hết hạn token.
  const isRefreshable =
    response.status === HttpStatus.Unauthorized &&
    !config._retry &&
    !config.skipAuthRefresh &&
    !isUnauthenticatedPath(config.url) &&
    tokenStore.hasSession()
  if (!isRefreshable) throw error

  // 401 của bước kiểm tra thông tin (vd. sai mật khẩu hiện tại) trên phiên còn sống: trả nguyên lỗi, không refresh,
  // không kết thúc phiên và không gửi lại request (gửi lại sẽ tính thêm một lần sai vào giới hạn của server).
  if (!adapter.isAccessTokenRejected(problemError(response))) throw error

  config._retry = true
  // Request đi bằng token cũ nhưng phiên đã được làm mới/thay trong lúc chờ: retry ngay bằng token hiện tại.
  const current = tokenStore.getAccess()
  const sentWithStaleToken = !!current && config.headers.get('Authorization') !== bearer(current)

  // Backend không có refresh token: 401 của token hiện tại nghĩa là phiên đã hết, không có cách nào làm mới.
  if (!adapter.refreshSupported) {
    if (sentWithStaleToken) return client.request(config)
    expireSession()
    throw error
  }

  try {
    if (!sentWithStaleToken) await refreshSession()
  } catch (refreshError) {
    // Hết phiên đã được phát qua onSessionExpired. Lỗi mạng thì báo đúng là lỗi mạng (để UI hiện banner ngoại tuyến).
    throw refreshError instanceof ApiError && refreshError.isNetwork ? refreshError : error
  }
  return client.request(config)
}

export function installAuth(client: AxiosInstance): void {
  client.interceptors.request.use((config) => {
    if (isUnauthenticatedPath(config.url)) return config
    const access = tokenStore.getAccess()
    if (access) config.headers.set('Authorization', bearer(access))
    return config
  })
  client.interceptors.response.use(undefined, (error: unknown) => {
    if (!isAxiosError(error)) throw error
    return handleAuthError(client, error)
  })
}

function isAxiosError(error: unknown): error is AxiosError {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error
}
