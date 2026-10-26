import type { AxiosError, AxiosInstance } from 'axios'
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

async function handleAuthError(client: AxiosInstance, error: AxiosError): Promise<unknown> {
  const { response, config } = error
  if (!response || !config) throw error

  const adapter = getAuthAdapter()

  if (response.status === HttpStatus.Forbidden) {
    // Interceptor này chạy trước bộ chuẩn hoá lỗi nên tự dựng ApiError để hỏi adapter.
    const apiError = new ApiError({
      status: response.status,
      ...readProblem(response.data, response.status),
    })
    if (adapter.forbiddenRequiresPasswordChange(apiError)) emitPasswordChangeRequired()
    throw error
  }

  // Đường dẫn không cần Bearer (đăng nhập, refresh…) trả 401 nghĩa là sai thông tin, không phải hết hạn token.
  const isRefreshable =
    response.status === HttpStatus.Unauthorized &&
    !config._retry &&
    !config.skipAuthRefresh &&
    !adapter.unauthenticatedPaths.some((path) => config.url?.startsWith(path)) &&
    tokenStore.hasSession()
  if (!isRefreshable) throw error

  // Backend không có refresh token: 401 nghĩa là phiên đã hết, không có cách nào làm mới.
  if (!adapter.refreshSupported) {
    expireSession()
    throw error
  }

  config._retry = true
  // Request đi bằng token cũ nhưng phiên đã được làm mới trong lúc chờ: retry ngay, không xoay token thêm lần nữa.
  const current = tokenStore.getAccess()
  const needsRefresh = !current || config.headers.get('Authorization') === bearer(current)
  try {
    if (needsRefresh) await refreshSession()
  } catch (refreshError) {
    // Hết phiên đã được phát qua onSessionExpired. Lỗi mạng thì báo đúng là lỗi mạng (để UI hiện banner ngoại tuyến).
    throw refreshError instanceof ApiError && refreshError.isNetwork ? refreshError : error
  }
  return client.request(config)
}

export function installAuth(client: AxiosInstance): void {
  client.interceptors.request.use((config) => {
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
