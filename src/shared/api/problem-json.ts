import { messages } from '@/shared/i18n'
import type { ApiFieldErrors } from './api-error'

export interface ProblemDetails {
  code: string
  detail: string
  errors?: ApiFieldErrors
}

// Thân lỗi của API là application/problem+json; phản hồi khác (proxy, 502) vẫn phải ra ApiError dùng được.
export function readProblem(data: unknown, status: number): ProblemDetails {
  if (typeof data === 'object' && data !== null) {
    const body = data as Record<string, unknown>
    return {
      code: typeof body.code === 'string' ? body.code : `http_${status}`,
      detail:
        typeof body.detail === 'string' && body.detail ? body.detail : messages.errors.fallback,
      errors: isFieldErrors(body.errors) ? body.errors : undefined,
    }
  }
  return { code: `http_${status}`, detail: messages.errors.fallback }
}

function isFieldErrors(value: unknown): value is ApiFieldErrors {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
