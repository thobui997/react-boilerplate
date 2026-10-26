export { ApiError, getErrorMessage, type ApiFieldErrors } from './api-error'
export { ApiErrorCode, HttpStatus } from './error-codes'
export { createHttpClient, type HttpClientOptions } from './create-http-client'
export { readProblem } from './problem-json'
export { http } from './http'
export {
  broadcastSignOut,
  expireSession,
  getAuthAdapter,
  onPasswordChangeRequired,
  onRemoteSignOut,
  onSessionExpired,
  refreshSession,
  setAuthAdapterForTest,
  tokenStore,
  type AuthAdapter,
  type AuthTokens,
  type AuthUser,
  type ChangePasswordInput,
  type Credentials,
} from './auth'
// test only — app code must use getAuthAdapter()
export { defaultAdapter } from './auth'
