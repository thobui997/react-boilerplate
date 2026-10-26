import axios from 'axios'
import { http as mswHttp, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { api } from '@/test/msw/api'
import { env } from '@/shared/config'
import { ApiError } from './api-error'
import { createHttpClient } from './create-http-client'

describe('createHttpClient', () => {
  test('mặc định baseURL là env.apiBase và timeout 20000', () => {
    const client = createHttpClient()

    expect(client.defaults.baseURL).toBe(env.apiBase)
    expect(client.defaults.timeout).toBe(20_000)
  })

  test('nhận baseURL và timeoutMs tuỳ chỉnh', () => {
    const client = createHttpClient({ baseURL: '/other', timeoutMs: 5000 })

    expect(client.defaults.baseURL).toBe('/other')
    expect(client.defaults.timeout).toBe(5000)
  })

  test('install chạy trước chuẩn hoá: interceptor của install thấy AxiosError gốc', async () => {
    server.use(
      mswHttp.get(api('/me'), () =>
        HttpResponse.json({ status: 500, code: 'x', detail: 'x' }, { status: 500 }),
      ),
    )
    const seen: unknown[] = []
    const client = createHttpClient({
      install: (instance) => {
        instance.interceptors.response.use(undefined, (error: unknown) => {
          seen.push(error)
          return Promise.reject(error)
        })
      },
    })

    const error = await client.get('/me').catch((e: unknown) => e)

    expect(seen).toHaveLength(1)
    expect(axios.isAxiosError(seen[0])).toBe(true)
    expect(error).toBeInstanceOf(ApiError)
  })

  test('huỷ bằng AbortSignal giữ nguyên lỗi huỷ để TanStack Query nhận ra', async () => {
    server.use(
      mswHttp.get(api('/me'), async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        return HttpResponse.json({})
      }),
    )
    const controller = new AbortController()

    const pending = createHttpClient()
      .get('/me', { signal: controller.signal })
      .catch((e: unknown) => e)
    controller.abort()
    const error = await pending

    expect(axios.isCancel(error)).toBe(true)
  })
})
