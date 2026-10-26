import { http as mswHttp, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { api } from '@/test/msw/api'
import { accessOnlyAdapter } from '@/test/auth/access-only-adapter'
import {
  defaultAdapter,
  http,
  onSessionExpired,
  setAuthAdapterForTest,
  tokenStore,
  type AuthAdapter,
} from '@/shared/api'

interface Case {
  name: string
  adapter: AuthAdapter
  logoutPath: string
  // Handler đăng nhập, lấy người dùng hiện tại, refresh (nếu có) của backend mà adapter nói chuyện.
  mock: (seenAuth: (string | null)[]) => void
}

function unauthorized() {
  return HttpResponse.json({ status: 401, code: 'unauthorized', detail: 'x' }, { status: 401 })
}

const cases: Case[] = [
  {
    name: 'defaultAdapter',
    adapter: defaultAdapter,
    logoutPath: '/auth/logout',
    mock: (seenAuth) =>
      server.use(
        mswHttp.post(api('/auth/login'), () =>
          HttpResponse.json({ accessToken: 'login-access', refreshToken: 'login-refresh' }),
        ),
        mswHttp.post(api('/auth/refresh'), () =>
          HttpResponse.json({ accessToken: 'new-access', refreshToken: 'r1' }),
        ),
        mswHttp.get(api('/me'), ({ request }) => {
          seenAuth.push(request.headers.get('Authorization'))
          return HttpResponse.json({
            id: '1',
            username: 'u',
            fullName: 'User One',
            role: { id: 'r1', name: 'admin' },
            permissions: ['x'],
            mustChangePassword: false,
          })
        }),
      ),
  },
  {
    name: 'accessOnlyAdapter',
    adapter: accessOnlyAdapter,
    logoutPath: '/session/end',
    mock: (seenAuth) =>
      server.use(
        mswHttp.post(api('/session/start'), () => HttpResponse.json({ token: 'login-access' })),
        mswHttp.get(api('/session/me'), ({ request }) => {
          seenAuth.push(request.headers.get('Authorization'))
          return HttpResponse.json({ uid: '1', name: 'User One', roles: ['admin'], perms: ['x'] })
        }),
      ),
  },
]

describe.each(cases)('interceptor auth theo hợp đồng AuthAdapter: $name', (testCase) => {
  const refresh = vi.fn(testCase.adapter.refresh)
  const adapter: AuthAdapter = { ...testCase.adapter, refresh }
  const seenAuth: (string | null)[] = []
  const expired = vi.fn()
  let off: () => void = () => undefined

  beforeEach(() => {
    localStorage.clear()
    setAuthAdapterForTest(adapter)
    tokenStore.setSession({ accessToken: 'old-access', refreshToken: 'r0' })
    testCase.mock(seenAuth)
    off = onSessionExpired(expired)
  })

  afterEach(() => {
    off()
    tokenStore.clear()
    setAuthAdapterForTest(null)
    localStorage.clear()
    refresh.mockClear()
    expired.mockClear()
    seenAuth.length = 0
  })

  test('401 ở mọi đường dẫn trong unauthenticatedPaths: không refresh, không phát hết phiên', async () => {
    for (const path of adapter.unauthenticatedPaths) {
      server.use(mswHttp.post(api(path), () => unauthorized()))

      const error = await http.post(path, {}).catch((e: unknown) => e)

      expect(error).toMatchObject({ status: 401 })
    }
    expect(refresh).not.toHaveBeenCalled()
    expect(expired).not.toHaveBeenCalled()
    expect(tokenStore.hasSession()).toBe(true)
  })

  test('401 ở đường dẫn thường: refresh rồi retry nếu adapter hỗ trợ, ngược lại kết thúc phiên', async () => {
    server.use(
      mswHttp.get(api('/data'), ({ request }) =>
        request.headers.get('Authorization') === 'Bearer new-access'
          ? HttpResponse.json({ ok: true })
          : unauthorized(),
      ),
    )

    const result = await http.get('/data').catch((e: unknown) => e)

    if (adapter.refreshSupported) {
      expect(result).toMatchObject({ status: 200 })
      expect(refresh).toHaveBeenCalledTimes(1)
      expect(expired).not.toHaveBeenCalled()
      expect(tokenStore.getAccess()).toBe('new-access')
    } else {
      expect(result).toMatchObject({ status: 401 })
      expect(refresh).not.toHaveBeenCalled()
      expect(expired).toHaveBeenCalledTimes(1)
      expect(tokenStore.hasSession()).toBe(false)
      expect(tokenStore.getAccess()).toBeNull()
    }
  })

  test('đăng nhập, lấy người dùng và đăng xuất đều đi qua endpoint của adapter', async () => {
    tokenStore.clear()
    server.use(
      mswHttp.post(api(testCase.logoutPath), () => new HttpResponse(null, { status: 204 })),
    )

    const tokens = await adapter.login(http, { username: 'u', password: 'p' })
    tokenStore.setSession(tokens)
    const user = await adapter.fetchCurrentUser(http)

    expect(user.id).toBe('1')
    expect(seenAuth).toEqual(['Bearer login-access'])
    await expect(adapter.logout(http, tokenStore.getRefresh())).resolves.toBeUndefined()
  })

  test('401 ở request đăng xuất (skipAuthRefresh): không refresh, không phát hết phiên', async () => {
    server.use(mswHttp.post(api(testCase.logoutPath), () => unauthorized()))

    const error = await adapter.logout(http, tokenStore.getRefresh()).catch((e: unknown) => e)

    expect(error).toMatchObject({ status: 401 })
    expect(refresh).not.toHaveBeenCalled()
    expect(expired).not.toHaveBeenCalled()
    expect(tokenStore.hasSession()).toBe(true)
  })
})
