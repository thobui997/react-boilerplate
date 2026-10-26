import { http as mswHttp, HttpResponse } from 'msw'
import { api } from '@/test/msw/api'
import { server } from '@/test/msw/server'
import { STORAGE_KEYS } from '@/shared/config'
import { http, onSessionExpired, refreshSession, tokenStore } from '@/shared/api'

const DATA_URL = api('/data')
const REFRESH_URL = api('/auth/refresh')

function unauthorized() {
  return HttpResponse.json({ status: 401, code: 'unauthorized', detail: 'x' }, { status: 401 })
}

beforeEach(() => {
  localStorage.clear()
  tokenStore.setSession({ accessToken: 'old-access', refreshToken: 'r0' })
})

afterEach(() => {
  tokenStore.clear()
})

describe('/auth/refresh thất bại: khi nào kết thúc phiên (RF 3, RF 5)', () => {
  test('refresh bị giới hạn tần suất (429) giữ nguyên phiên, không đăng xuất oan', async () => {
    const expired = vi.fn()
    const off = onSessionExpired(expired)
    server.use(
      mswHttp.post(REFRESH_URL, () =>
        HttpResponse.json(
          { status: 429, code: 'too_many_requests', detail: 'Quá nhiều yêu cầu.' },
          { status: 429, headers: { 'Retry-After': '30' } },
        ),
      ),
      mswHttp.get(DATA_URL, () => unauthorized()),
    )

    await http.get('/data').catch(() => undefined)

    expect(tokenStore.hasSession()).toBe(true)
    expect(expired).not.toHaveBeenCalled()
    off()
  })

  test.each([
    ['mất kết nối', () => HttpResponse.error()],
    ['máy chủ trả 502', () => new HttpResponse('Bad gateway', { status: 502 })],
  ])(
    'refresh đã gửi đi mà không biết kết quả (%s): token coi như đã tiêu, kết thúc phiên thay vì gửi lại',
    async (_label, respond) => {
      const expired = vi.fn()
      const off = onSessionExpired(expired)
      const sentTokens: string[] = []
      server.use(
        mswHttp.post(REFRESH_URL, async ({ request }) => {
          sentTokens.push(((await request.json()) as { refreshToken: string }).refreshToken)
          return respond()
        }),
        mswHttp.get(DATA_URL, () => unauthorized()),
      )

      await http.get('/data').catch(() => undefined)
      await http.get('/data').catch(() => undefined)

      expect(sentTokens).toEqual(['r0'])
      expect(tokenStore.hasSession()).toBe(false)
      expect(expired).toHaveBeenCalledTimes(1)
      off()
    },
  )

  test('đang ngoại tuyến thì không gửi refresh, giữ phiên và báo lỗi mạng', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const expired = vi.fn()
    const off = onSessionExpired(expired)
    let refreshCalls = 0
    server.use(
      mswHttp.post(REFRESH_URL, () => {
        refreshCalls++
        return HttpResponse.json({})
      }),
    )
    server.use(mswHttp.get(DATA_URL, () => unauthorized()))

    const error = await http.get('/data').catch((e: unknown) => e)

    expect(refreshCalls).toBe(0)
    expect(tokenStore.hasSession()).toBe(true)
    expect(expired).not.toHaveBeenCalled()
    expect(error).toMatchObject({ isNetwork: true })
    off()
    vi.restoreAllMocks()
  })
})

test('phiên bị xoá (đăng xuất) trong lúc refresh đang bay: token mới KHÔNG được ghi lại', async () => {
  server.use(
    mswHttp.post(REFRESH_URL, async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
      return HttpResponse.json({ accessToken: 'a2', refreshToken: 'r2' })
    }),
  )

  const pending = refreshSession().catch(() => undefined)
  // Đợi request refresh đã thực sự bay đi rồi mới đăng xuất.
  await new Promise((resolve) => setTimeout(resolve, 20))
  tokenStore.clear()
  await pending

  expect(tokenStore.hasSession()).toBe(false)
  expect(tokenStore.getAccess()).toBeNull()
  expect(localStorage.getItem(STORAGE_KEYS.Session)).toBeNull()
})
