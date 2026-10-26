import { renderHook } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { sessionQueries } from '@/entities/session'
import { setAuthAdapterForTest, tokenStore } from '@/shared/api'
import { STORAGE_KEYS } from '@/shared/config'
import { accessOnlyAdapter } from '@/test/auth/access-only-adapter'
import { makeUser } from '@/test/fixtures/user'
import { api } from '@/test/msw/api'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/query-client'
import { createQueryWrapper } from '@/test/wrapper'
import { useSignOut } from './use-sign-out'

function setup() {
  localStorage.clear()
  tokenStore.setSession({ accessToken: 'a', refreshToken: 'r-cua-u1' })
  const client = createTestQueryClient()
  client.setQueryData(sessionQueries.current().queryKey, makeUser())
  const { result } = renderHook(() => useSignOut(), { wrapper: createQueryWrapper(client) })
  return { client, signOut: result.current }
}

afterEach(() => {
  setAuthAdapterForTest(null)
  tokenStore.clear()
})

test('gọi POST /auth/logout với refresh token hiện tại', async () => {
  let body: unknown
  server.use(
    http.post(api('/auth/logout'), async ({ request }) => {
      body = await request.json()
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const { signOut } = setup()

  await signOut()

  expect(body).toEqual({ refreshToken: 'r-cua-u1' })
})

test.each([
  [
    'máy chủ lỗi 500',
    () => HttpResponse.json({ status: 500, code: 'internal_error', detail: 'x' }, { status: 500 }),
  ],
  ['mất mạng', () => HttpResponse.error()],
])('dù request logout lỗi (%s) vẫn dọn sạch phiên cục bộ', async (_label, respond) => {
  server.use(http.post(api('/auth/logout'), respond))
  const broadcast = new BroadcastChannel('app-auth')
  const messages: unknown[] = []
  broadcast.onmessage = (event) => messages.push(event.data)
  const { client, signOut } = setup()

  await signOut()
  await new Promise((resolve) => setTimeout(resolve, 20))

  expect(tokenStore.hasSession()).toBe(false)
  expect(tokenStore.getAccess()).toBeNull()
  expect(client.getQueryCache().getAll()).toHaveLength(0)
  expect(messages).toContainEqual({ type: 'signed-out' })
  broadcast.close()
})

test('không có người dùng trong cache vẫn đăng xuất được', async () => {
  server.use(http.post(api('/auth/logout'), () => new HttpResponse(null, { status: 204 })))
  localStorage.clear()
  tokenStore.setSession({ accessToken: 'a', refreshToken: 'r' })
  const client = createTestQueryClient()
  const { result } = renderHook(() => useSignOut(), { wrapper: createQueryWrapper(client) })

  await result.current()

  expect(tokenStore.hasSession()).toBe(false)
})

test('không có phiên thì không gọi logout nhưng vẫn dọn cache và báo các tab khác', async () => {
  let logoutCalls = 0
  server.use(
    http.post(api('/auth/logout'), () => {
      logoutCalls++
      return new HttpResponse(null, { status: 204 })
    }),
  )
  localStorage.clear()
  tokenStore.clear()
  const broadcast = new BroadcastChannel('app-auth')
  const messages: unknown[] = []
  broadcast.onmessage = (event) => messages.push(event.data)
  const client = createTestQueryClient()
  client.setQueryData(sessionQueries.current().queryKey, makeUser())
  const { result } = renderHook(() => useSignOut(), { wrapper: createQueryWrapper(client) })

  await result.current()
  await new Promise((resolve) => setTimeout(resolve, 20))

  expect(logoutCalls).toBe(0)
  expect(client.getQueryCache().getAll()).toHaveLength(0)
  expect(messages).toContainEqual({ type: 'signed-out' })
  broadcast.close()
})

describe('access token đã hết hạn lúc đăng xuất', () => {
  test('logout 401 không bị tự refresh/retry: token mới không được sinh ra và phiên kết thúc', async () => {
    const counters = { refresh: 0, logoutBodies: [] as string[] }
    server.use(
      http.post(api('/auth/logout'), async ({ request }) => {
        counters.logoutBodies.push(
          ((await request.json()) as { refreshToken: string }).refreshToken,
        )
        return HttpResponse.json(
          { status: 401, code: 'unauthorized', detail: 'hết hạn' },
          { status: 401 },
        )
      }),
      http.post(api('/auth/refresh'), async () => {
        counters.refresh++
        await new Promise((resolve) => setTimeout(resolve, 60))
        return HttpResponse.json({ accessToken: 'a2', refreshToken: 'r2' })
      }),
    )
    const { signOut } = setup()

    await signOut()
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(counters.refresh).toBe(0)
    expect(counters.logoutBodies).toEqual(['r-cua-u1'])
    expect(tokenStore.hasSession()).toBe(false)
    expect(localStorage.getItem(STORAGE_KEYS.Session)).toBeNull()
  })
})

test('adapter không có refresh vẫn đăng xuất: logout gọi với refreshToken null, token bị xóa', async () => {
  const logout = vi.fn(accessOnlyAdapter.logout)
  setAuthAdapterForTest({ ...accessOnlyAdapter, logout })
  server.use(http.post(api('/session/end'), () => new HttpResponse(null, { status: 204 })))
  localStorage.clear()
  tokenStore.setSession({ accessToken: 'access-only' })
  const client = createTestQueryClient()
  const { result } = renderHook(() => useSignOut(), { wrapper: createQueryWrapper(client) })

  await result.current()

  expect(logout).toHaveBeenCalledTimes(1)
  expect(logout.mock.calls[0]?.[1]).toBeNull()
  expect(tokenStore.hasSession()).toBe(false)
  expect(tokenStore.getAccess()).toBeNull()
})
