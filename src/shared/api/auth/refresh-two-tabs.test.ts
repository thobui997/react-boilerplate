import { http as mswHttp, HttpResponse } from 'msw'
import { api } from '@/test/msw/api'
import { server } from '@/test/msw/server'
import { STORAGE_KEYS } from '@/shared/config'

type Api = typeof import('@/shared/api')

// Mỗi lần import sau resetModules là một "tab": có bộ nhớ (access token, single-flight) riêng nhưng dùng chung
// localStorage, BroadcastChannel và navigator.locks.
async function openTab(): Promise<Api> {
  vi.resetModules()
  return import('@/shared/api')
}

function installSequentialLocks() {
  let chain: Promise<unknown> = Promise.resolve()
  const request = (_name: string, callback: () => Promise<unknown>) => {
    const run = chain.then(() => callback())
    chain = run.catch(() => undefined)
    return run
  }
  Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'locks')
  localStorage.clear()
})

describe('hai tab refresh đồng thời (RF 5)', () => {
  test.each([
    ['có navigator.locks', true],
    ['khoá thủ công qua localStorage', false],
  ])(
    'tab vào sau dùng lại token của tab trước, không gọi /auth/refresh lần hai (%s)',
    async (_label, withLocks) => {
      if (withLocks) installSequentialLocks()
      localStorage.setItem(STORAGE_KEYS.Session, 'r0')
      let refreshCalls = 0
      server.use(
        mswHttp.post(api('/auth/refresh'), async () => {
          refreshCalls++
          await new Promise((resolve) => setTimeout(resolve, 30))
          return HttpResponse.json({ accessToken: 'a1', refreshToken: 'r1' })
        }),
      )
      const tabA = await openTab()
      const tabB = await openTab()

      const [accessA, accessB] = await Promise.all([tabA.refreshSession(), tabB.refreshSession()])

      expect(refreshCalls).toBe(1)
      expect(accessA).toBe('a1')
      expect(accessB).toBe('a1')
      expect(localStorage.getItem(STORAGE_KEYS.Session)).toBe('r1')
      expect(tabB.tokenStore.getAccess()).toBe('a1')
    },
  )
})

test('hai lần refreshSession trong cùng tab chia sẻ một request (single-flight)', async () => {
  localStorage.setItem(STORAGE_KEYS.Session, 'r0')
  let refreshCalls = 0
  server.use(
    mswHttp.post(api('/auth/refresh'), async () => {
      refreshCalls++
      await new Promise((resolve) => setTimeout(resolve, 30))
      return HttpResponse.json({ accessToken: 'a1', refreshToken: 'r1' })
    }),
  )
  const tab = await openTab()

  await Promise.all([tab.refreshSession(), tab.refreshSession()])

  expect(refreshCalls).toBe(1)
})

test('tab khác được báo hết phiên khi một tab bị từ chối refresh', async () => {
  localStorage.setItem(STORAGE_KEYS.Session, 'r0')
  server.use(
    mswHttp.post(api('/auth/refresh'), () =>
      HttpResponse.json(
        { status: 401, code: 'refresh_reuse_detected', detail: 'Phiên không hợp lệ.' },
        { status: 401 },
      ),
    ),
  )
  const tabA = await openTab()
  const tabB = await openTab()
  tabB.tokenStore.setSession({ accessToken: 'b-access', refreshToken: 'r0' })
  const expiredInB = new Promise<void>((resolve) => {
    tabB.onSessionExpired(resolve)
  })

  await tabA.refreshSession().catch(() => undefined)
  await expiredInB

  expect(tabB.tokenStore.getAccess()).toBeNull()
})
