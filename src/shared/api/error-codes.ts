import type { ValueOf } from '@/shared/lib/const-enum'

// Mã lỗi `code` dùng chung của máy chủ (problem+json) cộng các mã client tự đặt (NetworkError, SessionMissing, SessionChanged).
// Mã domain do từng entity tự khai báo. Mã lạ của máy chủ vẫn đến nguyên văn ở `ApiError.code`.
export const ApiErrorCode = {
  Conflict: 'conflict',
  Forbidden: 'forbidden',
  InvalidCredentials: 'invalid_credentials',
  NetworkError: 'network_error',
  NotFound: 'not_found',
  PasswordChangeRequired: 'password_change_required',
  SessionChanged: 'session_changed',
  SessionMissing: 'session_missing',
  WeakPassword: 'weak_password',
} as const
export type ApiErrorCode = ValueOf<typeof ApiErrorCode>

export const HttpStatus = {
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  Conflict: 409,
  UnprocessableEntity: 422,
  TooManyRequests: 429,
  InternalServerError: 500,
} as const
export type HttpStatus = ValueOf<typeof HttpStatus>
