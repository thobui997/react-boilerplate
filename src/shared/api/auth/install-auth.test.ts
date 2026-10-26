import { http as mswHttp, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { STORAGE_KEYS } from '@/shared/config'
import {
  ApiError,
  http,
  onPasswordChangeRequired,
  onSessionExpired,
  tokenStore,
} from '@/shared/api'

const DATA_URL = '/api/v1/data'
const REFRESH_URL = '/api/v1/auth/refresh'

function refreshBody(accessToken: string, refreshToken: string) {
  return { accessToken, refreshToken }
}

function mockRefresh(
  onCall: () => void,
  response: () => Response = () => HttpResponse.json(refreshBody('new-access', 'r1')),
) {
  server.use(
    mswHttp.post(REFRESH_URL, async () => {
      onCall()
      await new Promise((resolve) => setTimeout(resolve, 40))
      return response()
    }),
  )
}

beforeEach(() => {
  localStorage.clear()
  tokenStore.setSession({ accessToken: 'old-access', refreshToken: 'r0' })
})

afterEach(() => {
  tokenStore.clear()
})

describe('401 song song (RF 5)', () => {
  test('5 request cùng 401 chỉ refresh đúng 1 lần và mỗi request được retry đúng 1 lần', async () => {
    let refreshCalls = 0
    const seenAuth: (string | null)[] = []
    mockRefresh(() => refreshCalls++)
    server.use(
      mswHttp.get(DATA_URL, ({ request }) => {
        const auth = request.headers.get('Authorization')
        seenAuth.push(auth)
        return auth === 'Bearer new-access'
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ status: 401, code: 'unauthorized', detail: 'x' }, { status: 401 })
      }),
    )

    const results = await Promise.all(Array.from({ length: 5 }, () => http.get('/data')))

    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200])
    expect(refreshCalls).toBe(1)
    expect(seenAuth.filter((a) => a === 'Bearer old-access')).toHaveLength(5)
    expect(seenAuth.filter((a) => a === 'Bearer new-access')).toHaveLength(5)
    expect(localStorage.getItem(STORAGE_KEYS.Session)).toBe('r1')
    expect(tokenStore.getAccess()).toBe('new-access')
  })

  test('refresh_reuse_detected phát onSessionExpired đúng một lần, xoá phiên và không làm request treo', async () => {
    const expired = vi.fn()
    const off = onSessionExpired(expired)
    mockRefresh(
      () => undefined,
      () =>
        HttpResponse.json(
          { status: 401, code: 'refresh_reuse_detected', detail: 'Phiên không hợp lệ.' },
          { status: 401 },
        ),
    )
    server.use(
      mswHttp.get(DATA_URL, () =>
        HttpResponse.json({ status: 401, code: 'unauthorized', detail: 'x' }, { status: 401 }),
      ),
    )

    const results = await Promise.allSettled(Array.from({ length: 5 }, () => http.get('/data')))

    expect(
      results.every(
        (r) => r.status === 'rejected' && r.reason instanceof ApiError && r.reason.status === 401,
      ),
    ).toBe(true)
    expect(expired).toHaveBeenCalledTimes(1)
    expect(tokenStore.hasSession()).toBe(false)
    off()
  })

  test.each(['/auth/change-password', '/auth/logout'])(
    '401 ở %s vẫn được refresh rồi retry (cần Bearer, token có thể đã hết hạn lúc rảnh)',
    async (path) => {
      let refreshCalls = 0
      mockRefresh(() => refreshCalls++)
      server.use(
        mswHttp.post(`/api/v1${path}`, ({ request }) =>
          request.headers.get('Authorization') === 'Bearer new-access'
            ? new HttpResponse(null, { status: 204 })
            : HttpResponse.json(
                { status: 401, code: 'unauthorized', detail: 'x' },
                { status: 401 },
              ),
        ),
      )

      const response = await http.post(path, {})

      expect(response.status).toBe(204)
      expect(refreshCalls).toBe(1)
    },
  )

  test('401 muộn của request gửi bằng token cũ được retry bằng token hiện tại mà không refresh', async () => {
    let refreshCalls = 0
    mockRefresh(() => refreshCalls++)
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      mswHttp.get(DATA_URL, async ({ request }) => {
        if (request.headers.get('Authorization') === 'Bearer old-access') {
          await gate
          return HttpResponse.json(
            { status: 401, code: 'unauthorized', detail: 'x' },
            { status: 401 },
          )
        }
        return HttpResponse.json({ ok: true })
      }),
    )

    const pending = http.get('/data')
    tokenStore.setSession({ accessToken: 'fresh-access', refreshToken: 'r2' })
    release()
    const response = await pending

    expect(response.status).toBe(200)
    expect(refreshCalls).toBe(0)
  })
})

describe('không kích hoạt refresh', () => {
  test.each(['/auth/login', '/auth/refresh'])('401 ở %s', async (path) => {
    let refreshCalls = 0
    mockRefresh(() => refreshCalls++)
    server.use(
      mswHttp.post(`/api/v1${path}`, () =>
        HttpResponse.json(
          { status: 401, code: 'invalid_credentials', detail: 'Sai.' },
          { status: 401 },
        ),
      ),
    )

    const error = await http.post(path, {}).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('invalid_credentials')
    expect(refreshCalls).toBe(0)
  })

  test('403 password_change_required phát sự kiện đúng một lần và không refresh', async () => {
    let refreshCalls = 0
    mockRefresh(() => refreshCalls++)
    const required = vi.fn()
    const off = onPasswordChangeRequired(required)
    server.use(
      mswHttp.get(DATA_URL, () =>
        HttpResponse.json(
          { status: 403, code: 'password_change_required', detail: 'Cần đổi mật khẩu.' },
          { status: 403 },
        ),
      ),
    )

    const error = await http.get('/data').catch((e: unknown) => e)

    expect(error).toMatchObject({ status: 403, code: 'password_change_required' })
    expect(required).toHaveBeenCalledTimes(1)
    expect(refreshCalls).toBe(0)
    off()
  })

  test('401 khi không có phiên: không refresh, không phát hết phiên', async () => {
    tokenStore.clear()
    const expired = vi.fn()
    const off = onSessionExpired(expired)
    let refreshCalls = 0
    mockRefresh(() => refreshCalls++)
    server.use(
      mswHttp.get(DATA_URL, () =>
        HttpResponse.json({ status: 401, code: 'unauthorized', detail: 'x' }, { status: 401 }),
      ),
    )

    await http.get('/data').catch(() => undefined)

    expect(refreshCalls).toBe(0)
    expect(expired).not.toHaveBeenCalled()
    off()
  })
})

test('request gắn Bearer từ access token hiện tại', async () => {
  let auth: string | null = null
  server.use(
    mswHttp.get(DATA_URL, ({ request }) => {
      auth = request.headers.get('Authorization')
      return HttpResponse.json({})
    }),
  )

  await http.get('/data')

  expect(auth).toBe('Bearer old-access')
})
