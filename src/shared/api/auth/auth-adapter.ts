import type { AxiosInstance } from 'axios'
import type { ApiError } from '../api-error'
import type { AuthUser } from './auth-user'

declare module 'axios' {
  interface AxiosRequestConfig {
    // Request không được tự refresh rồi gửi lại khi gặp 401 (đăng xuất: refresh sẽ sinh token mới vừa bị bỏ lại).
    skipAuthRefresh?: boolean
  }
  interface InternalAxiosRequestConfig {
    _retry?: boolean
  }
}

export interface Credentials {
  username: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  // Backend không có refresh token thì bỏ trống.
  refreshToken?: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

// Điểm nối giữa template và backend: mỗi backend khác nhau chỉ cần cung cấp một adapter (xem auth.config.ts).
export interface AuthAdapter {
  refreshSupported: boolean
  // Đường dẫn (tính từ baseURL) không gắn Bearer và không kích hoạt refresh khi 401.
  unauthenticatedPaths: readonly string[]
  login(client: AxiosInstance, credentials: Credentials): Promise<AuthTokens>
  refresh(client: AxiosInstance, refreshToken: string): Promise<AuthTokens>
  // Request đăng xuất PHẢI gửi kèm `{ skipAuthRefresh: true }`: 401 lúc đăng xuất không được refresh (sinh token mới
  // vừa bị bỏ lại) hay kết thúc phiên (phát onSessionExpired cho một lần đăng xuất tự nguyện).
  logout(client: AxiosInstance, refreshToken: string | null): Promise<void>
  changePassword(client: AxiosInstance, input: ChangePasswordInput): Promise<void>
  fetchCurrentUser(client: AxiosInstance, signal?: AbortSignal): Promise<AuthUser>
  // 401 này có nghĩa là access token bị từ chối (hết hạn/không hợp lệ → refresh hoặc kết thúc phiên), chứ không phải
  // lỗi kiểm tra thông tin trên một phiên còn sống (vd. sai mật khẩu hiện tại khi đổi mật khẩu)? Trả false thì interceptor
  // ném nguyên lỗi cho nơi gọi: không refresh, không kết thúc phiên, không gửi lại request.
  isAccessTokenRejected(error: ApiError): boolean
  // Lỗi của lần refresh có nghĩa là refresh token đã hết dùng được (phải đăng nhập lại)?
  isRefreshTokenSpent(error: ApiError): boolean
  // 403 này có nghĩa là người dùng phải đổi mật khẩu trước khi tiếp tục?
  forbiddenRequiresPasswordChange(error: ApiError): boolean
}
