export type ApiFieldErrors = Record<string, { code: string; message: string }[]>

export class ApiError extends Error {
  status: number
  code: string
  detail: string
  errors?: ApiFieldErrors
  retryAfterSeconds?: number
  // true khi không có phản hồi nào (mất mạng, hết thời gian chờ).
  isNetwork: boolean

  constructor(init: {
    status: number
    code: string
    detail: string
    errors?: ApiFieldErrors
    retryAfterSeconds?: number
    isNetwork?: boolean
  }) {
    super(init.detail)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.detail = init.detail
    this.errors = init.errors
    this.retryAfterSeconds = init.retryAfterSeconds
    this.isNetwork = init.isNetwork ?? false
  }
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.detail : fallback
}
