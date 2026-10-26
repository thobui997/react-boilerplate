import { ApiError, ApiErrorCode, getErrorMessage, HttpStatus } from '@/shared/api'
import { messages } from '@/shared/i18n'

export interface SignInErrorView {
  title: string
  message: string
}

const text = messages.login.errors

export function describeSignInError(error: unknown): SignInErrorView {
  if (error instanceof ApiError) {
    if (error.isNetwork) return { title: text.networkTitle, message: text.networkMessage }
    if (
      error.status === HttpStatus.Unauthorized &&
      error.code === ApiErrorCode.InvalidCredentials
    ) {
      return { title: text.invalidCredentialsTitle, message: text.invalidCredentialsMessage }
    }
    if (error.status === HttpStatus.TooManyRequests) {
      return {
        title: text.tooManyRequestsTitle,
        message: error.retryAfterSeconds
          ? text.retryAfter(error.retryAfterSeconds)
          : text.retryLater,
      }
    }
  }
  return { title: text.failedTitle, message: getErrorMessage(error, messages.errors.fallback) }
}
