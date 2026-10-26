import axios, { type AxiosInstance } from 'axios'
import { env } from '@/shared/config'
import { toApiError } from './normalize-error'

const DEFAULT_TIMEOUT_MS = 20_000

export interface HttpClientOptions {
  baseURL?: string
  timeoutMs?: number
  // Chạy TRƯỚC bộ chuẩn hoá lỗi: interceptor auth (xử lý 401) cần AxiosError gốc để retry.
  install?: (client: AxiosInstance) => void
}

export function createHttpClient(options: HttpClientOptions = {}): AxiosInstance {
  const { baseURL = env.apiBase, timeoutMs = DEFAULT_TIMEOUT_MS, install } = options
  const client = axios.create({ baseURL, timeout: timeoutMs })

  install?.(client)

  client.interceptors.response.use(undefined, (error: unknown) => {
    // Huỷ request (AbortSignal) không phải lỗi API: giữ nguyên để TanStack Query nhận ra.
    if (!axios.isAxiosError(error) || axios.isCancel(error)) return Promise.reject(error)
    return Promise.reject(toApiError(error))
  })

  return client
}
