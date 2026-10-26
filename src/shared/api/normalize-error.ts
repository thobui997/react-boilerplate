import type { AxiosError, AxiosResponse } from 'axios'
import { messages } from '@/shared/i18n'
import { ApiError } from './api-error'
import { readProblem } from './problem-json'
import { ApiErrorCode } from './error-codes'

export function readHeader(response: AxiosResponse | undefined, name: string): string | undefined {
  const value: unknown = response?.headers?.[name]
  return typeof value === 'string' ? value : undefined
}

export function toApiError(error: AxiosError): ApiError {
  const { response } = error
  if (!response) {
    return new ApiError({
      status: 0,
      code: ApiErrorCode.NetworkError,
      detail: messages.errors.network,
      isNetwork: true,
    })
  }
  const retryAfter = Number(readHeader(response, 'retry-after'))
  return new ApiError({
    status: response.status,
    ...readProblem(response.data, response.status),
    retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
  })
}
