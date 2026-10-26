import { http as mswHttp, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { api } from '@/test/msw/api'
import { messages } from '@/shared/i18n'
import { ApiError, getErrorMessage } from './api-error'
import { createHttpClient } from './create-http-client'
import { readProblem } from './problem-json'

const http = createHttpClient()

describe('chuẩn hoá lỗi', () => {
  test('422 problem+json thành ApiError đủ trường', async () => {
    server.use(
      mswHttp.put(api('/items/1'), () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Validation',
            status: 422,
            code: 'validation_failed',
            detail: 'Dữ liệu không hợp lệ.',
            errors: {
              name: [{ code: 'required', message: 'Cần nhập tên.' }],
            },
          },
          { status: 422, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )

    const error = await http.put('/items/1', {}).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 422,
      code: 'validation_failed',
      detail: 'Dữ liệu không hợp lệ.',
      isNetwork: false,
      errors: { name: [{ code: 'required', message: 'Cần nhập tên.' }] },
    })
  })

  test('mất mạng thành ApiError isNetwork', async () => {
    server.use(mswHttp.get(api('/me'), () => HttpResponse.error()))

    const error = await http.get('/me').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      isNetwork: true,
      status: 0,
      code: 'network_error',
      detail: messages.errors.network,
    })
  })

  test('phản hồi lỗi không phải problem+json vẫn thành ApiError có detail dự phòng', async () => {
    server.use(mswHttp.get(api('/me'), () => new HttpResponse('Bad gateway', { status: 502 })))

    const error = await http.get('/me').catch((e: unknown) => e)

    expect(error).toMatchObject({ status: 502, isNetwork: false, code: 'http_502' })
    expect((error as ApiError).detail).toBe(messages.errors.fallback)
  })

  test('đọc Retry-After trên 429', async () => {
    server.use(
      mswHttp.get(api('/me'), () =>
        HttpResponse.json(
          { status: 429, code: 'rate_limited', detail: 'Quá nhiều yêu cầu.' },
          { status: 429, headers: { 'Retry-After': '30' } },
        ),
      ),
    )

    const error = await http.get('/me').catch((e: unknown) => e)

    expect((error as ApiError).retryAfterSeconds).toBe(30)
  })

  test('thiếu Retry-After thì undefined', async () => {
    server.use(
      mswHttp.get(api('/me'), () =>
        HttpResponse.json({ status: 429, code: 'rate_limited', detail: 'x' }, { status: 429 }),
      ),
    )

    const error = await http.get('/me').catch((e: unknown) => e)

    expect((error as ApiError).retryAfterSeconds).toBeUndefined()
  })
})

describe('readProblem', () => {
  test('thân không phải object rơi về mã http_<status> và detail dự phòng', () => {
    expect(readProblem('oops', 500)).toEqual({
      code: 'http_500',
      detail: messages.errors.fallback,
    })
  })

  test('detail rỗng hoặc sai kiểu dùng detail dự phòng', () => {
    expect(readProblem({ code: 'x', detail: '' }, 400).detail).toBe(messages.errors.fallback)
    expect(readProblem({ code: 'x', detail: 1 }, 400).detail).toBe(messages.errors.fallback)
  })

  test('errors dạng mảng bị bỏ', () => {
    expect(readProblem({ code: 'x', detail: 'y', errors: [] }, 400).errors).toBeUndefined()
  })
})

describe('getErrorMessage', () => {
  test('ApiError trả detail, lỗi khác trả dự phòng', () => {
    const apiError = new ApiError({ status: 400, code: 'x', detail: 'Chi tiết' })

    expect(getErrorMessage(apiError, 'dự phòng')).toBe('Chi tiết')
    expect(getErrorMessage(new Error('boom'), 'dự phòng')).toBe('dự phòng')
  })
})
