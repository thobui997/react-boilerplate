// Tạm thời: Task 6 bổ sung `http`, auth và các export còn lại.
export { ApiError, getErrorMessage, type ApiFieldErrors } from './api-error'
export { ApiErrorCode, HttpStatus } from './error-codes'
export { createHttpClient, type HttpClientOptions } from './create-http-client'
export { readProblem } from './problem-json'
export type { AuthAdapter, AuthTokens, ChangePasswordInput, Credentials } from './auth/auth-adapter'
export type { AuthUser } from './auth/auth-user'
export { getAuthAdapter, setAuthAdapterForTest } from './auth/active-adapter'
export { defaultAdapter } from './auth/adapters/default'
