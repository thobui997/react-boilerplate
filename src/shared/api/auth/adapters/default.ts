import { ApiErrorCode, HttpStatus } from '../../error-codes'
import type { ApiError } from '../../api-error'
import type { AuthAdapter, AuthTokens } from '../auth-adapter'
import type { AuthUser } from '../auth-user'

// Hình dạng dữ liệu backend mặc định gửi về; chỉ dùng trong adapter này.
interface TokensWire {
  accessToken: string
  refreshToken: string
}

interface MeWire {
  id: string
  username: string
  fullName: string
  role: { id: string; name: string }
  permissions: string[]
  mustChangePassword: boolean
}

function toTokens(wire: TokensWire): AuthTokens {
  return { accessToken: wire.accessToken, refreshToken: wire.refreshToken }
}

// Không import session-events hay token-store để tránh vòng phụ thuộc với active-adapter.
export const defaultAdapter: AuthAdapter = {
  refreshSupported: true,
  unauthenticatedPaths: ['/auth/login', '/auth/refresh'],

  async login(client, credentials) {
    const { data } = await client.post<TokensWire>('/auth/login', {
      username: credentials.username,
      password: credentials.password,
    })
    return toTokens(data)
  },

  async refresh(client, refreshToken) {
    const { data } = await client.post<TokensWire>('/auth/refresh', { refreshToken })
    return toTokens(data)
  },

  async logout(client, refreshToken) {
    await client.post('/auth/logout', { refreshToken }, { skipAuthRefresh: true })
  },

  async changePassword(client, input) {
    await client.post('/auth/change-password', {
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    })
  },

  async fetchCurrentUser(client, signal) {
    const { data } = await client.get<MeWire>('/me', { signal })
    const user: AuthUser = {
      id: data.id,
      username: data.username,
      displayName: data.fullName,
      role: data.role.name,
      permissions: [...data.permissions],
      mustChangePassword: data.mustChangePassword,
    }
    return user
  },

  // 401 invalid_credentials là sai thông tin (vd. mật khẩu hiện tại), phiên vẫn còn sống.
  isAccessTokenRejected(error: ApiError) {
    return (
      error.status === HttpStatus.Unauthorized && error.code !== ApiErrorCode.InvalidCredentials
    )
  },

  // 429 và 4xx khác là lỗi tạm hoặc lỗi request, chưa kết luận được token đã hỏng.
  isRefreshTokenSpent(error: ApiError) {
    return (
      error.status === HttpStatus.Unauthorized ||
      error.isNetwork ||
      error.status >= HttpStatus.InternalServerError
    )
  },

  forbiddenRequiresPasswordChange(error: ApiError) {
    return (
      error.status === HttpStatus.Forbidden && error.code === ApiErrorCode.PasswordChangeRequired
    )
  },
}
