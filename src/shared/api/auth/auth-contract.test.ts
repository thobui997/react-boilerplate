import { http as mswHttp, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { api } from '@/test/msw/api'
import { accessOnlyAdapter } from '@/test/auth/access-only-adapter'
import {
  ApiError,
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
  changePasswordPath: string
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
    changePasswordPath: '/auth/change-password',
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
    changePasswordPath: '/session/secret',
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

  test('request tới unauthenticatedPaths không gắn Bearer, đường dẫn thường thì có', async () => {
    const seen: Record<string, string | null> = {}
    for (const path of [...adapter.unauthenticatedPaths, '/data']) {
      server.use(
        mswHttp.post(api(path), ({ request }) => {
          seen[path] = request.headers.get('Authorization')
          return HttpResponse.json({ token: 't', accessToken: 't', refreshToken: 'r' })
        }),
      )

      await http.post(path, {})
    }

    for (const path of adapter.unauthenticatedPaths) expect(seen[path]).toBeNull()
    expect(seen['/data']).toBe('Bearer old-access')
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

  test('401 invalid_credentials ở endpoint cần Bearer: hỏi adapter trước khi refresh/kết thúc phiên', async () => {
    let changeCalls = 0
    server.use(
      mswHttp.post(api(testCase.changePasswordPath), () => {
        changeCalls++
        return HttpResponse.json(
          { status: 401, code: 'invalid_credentials', detail: 'Sai mật khẩu.' },
          { status: 401 },
        )
      }),
    )
    const rejects = adapter.isAccessTokenRejected(
      new ApiError({ status: 401, code: 'invalid_credentials', detail: 'x' }),
    )

    const error = await adapter
      .changePassword(http, { currentPassword: 'sai', newPassword: 'moi' })
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 401, code: 'invalid_credentials' })
    if (rejects) {
      // Adapter coi mọi 401 là token bị từ chối (backend không có mã invalid_credentials).
      expect(expired).toHaveBeenCalledTimes(1)
      expect(tokenStore.hasSession()).toBe(false)
    } else {
      expect(changeCalls).toBe(1)
      expect(refresh).not.toHaveBeenCalled()
      expect(expired).not.toHaveBeenCalled()
      expect(tokenStore.hasSession()).toBe(true)
      expect(tokenStore.getAccess()).toBe('old-access')
    }
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

test('adapter không refresh: 401 muộn của request gửi bằng token cũ được retry bằng token hiện tại, không kết thúc phiên', async () => {
  setAuthAdapterForTest(accessOnlyAdapter)
  tokenStore.setSession({ accessToken: 'token-a' })
  const expired = vi.fn()
  const off = onSessionExpired(expired)
  const seen: (string | null)[] = []
  let release: () => void = () => undefined
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  server.use(
    mswHttp.get(api('/data'), async ({ request }) => {
      const auth = request.headers.get('Authorization')
      seen.push(auth)
      if (auth === 'Bearer token-a') {
        await gate
        return unauthorized()
      }
      return HttpResponse.json({ ok: true })
    }),
  )

  const pending = http.get('/data')
  await vi.waitFor(() => expect(seen).toHaveLength(1))
  tokenStore.setSession({ accessToken: 'token-b' })
  release()
  const response = await pending

  expect(response.status).toBe(200)
  expect(seen).toEqual(['Bearer token-a', 'Bearer token-b'])
  expect(expired).not.toHaveBeenCalled()
  expect(tokenStore.getAccess()).toBe('token-b')
  off()
  tokenStore.clear()
  setAuthAdapterForTest(null)
  localStorage.clear()
})
