import { http, HttpResponse } from 'msw'
import {
  defaultAdapter,
  setAuthAdapterForTest,
  tokenStore,
  type AuthAdapter,
  type AuthUser,
} from '@/shared/api'
import { STORAGE_KEYS } from '@/shared/config'
import { accessOnlyAdapter } from '@/test/auth/access-only-adapter'
import { makeMeDto } from '@/test/fixtures/user'
import { api } from '@/test/msw/api'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/query-client'
import { signIn, signInAndLoadUser } from './sign-in'

beforeEach(() => {
  tokenStore.clear()
})

test('signIn gửi username/password và lưu phiên (access ở bộ nhớ, refresh ở localStorage)', async () => {
  let body: unknown
  server.use(
    http.post(api('/auth/login'), async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ accessToken: 'a', refreshToken: 'r' })
    }),
  )

  await signIn({ username: 'an.nv', password: 'mat-khau-dai-123' })

  expect(body).toEqual({ username: 'an.nv', password: 'mat-khau-dai-123' })
  expect(tokenStore.getAccess()).toBe('a')
  expect(localStorage.getItem(STORAGE_KEYS.Session)).toBe('r')
})

describe('signInAndLoadUser', () => {
  const credentials = { username: 'an.nv', password: 'mat-khau-dai-123' }
  const loginOk = () =>
    http.post(api('/auth/login'), () => HttpResponse.json({ accessToken: 'a', refreshToken: 'r' }))

  test('chỉ resolve khi /me đã về và nạp người dùng vào cache phiên', async () => {
    server.use(
      loginOk(),
      http.get(api('/me'), () => HttpResponse.json(makeMeDto())),
    )
    const client = createTestQueryClient()

    await signInAndLoadUser(client, credentials)

    expect(client.getQueryData(['session', 'current'])).toMatchObject({
      displayName: 'Nguyễn Văn An',
    })
    expect(tokenStore.hasSession()).toBe(true)
  })

  test('đăng nhập sai thì ném lỗi và không tải /me', async () => {
    let meCalls = 0
    server.use(
      http.post(api('/auth/login'), () =>
        HttpResponse.json(
          { status: 401, code: 'invalid_credentials', detail: 'Sai.' },
          { status: 401 },
        ),
      ),
      http.get(api('/me'), () => {
        meCalls++
        return HttpResponse.json(makeMeDto())
      }),
    )

    await expect(signInAndLoadUser(createTestQueryClient(), credentials)).rejects.toMatchObject({
      code: 'invalid_credentials',
    })
    expect(meCalls).toBe(0)
  })

  test('/me lỗi: xoá token để không để lại phiên mồ côi và ném lại lỗi', async () => {
    server.use(
      loginOk(),
      http.get(api('/me'), () =>
        HttpResponse.json({ status: 500, code: 'internal_error', detail: 'x' }, { status: 500 }),
      ),
    )

    await expect(signInAndLoadUser(createTestQueryClient(), credentials)).rejects.toBeTruthy()

    expect(tokenStore.hasSession()).toBe(false)
  })
})

interface AdapterCase {
  name: string
  adapter: AuthAdapter
  mock: () => void
  expected: Pick<AuthUser, 'displayName' | 'role'>
}

const adapterCases: AdapterCase[] = [
  {
    name: 'defaultAdapter',
    adapter: defaultAdapter,
    mock: () =>
      server.use(
        http.post(api('/auth/login'), () =>
          HttpResponse.json({ accessToken: 'a', refreshToken: 'r' }),
        ),
        http.get(api('/me'), () => HttpResponse.json(makeMeDto())),
      ),
    expected: { displayName: 'Nguyễn Văn An', role: 'member' },
  },
  {
    name: 'accessOnlyAdapter',
    adapter: accessOnlyAdapter,
    mock: () =>
      server.use(
        http.post(api('/session/start'), () => HttpResponse.json({ token: 'a' })),
        http.get(api('/session/me'), () =>
          HttpResponse.json({ uid: '7', name: 'Trần Thị Bình', roles: ['admin'], perms: ['x'] }),
        ),
      ),
    expected: { displayName: 'Trần Thị Bình', role: 'admin' },
  },
]

describe.each(adapterCases)('signInAndLoadUser với $name', ({ adapter, mock, expected }) => {
  beforeEach(() => {
    setAuthAdapterForTest(adapter)
    mock()
  })

  afterEach(() => {
    tokenStore.clear()
    setAuthAdapterForTest(null)
  })

  test('đăng nhập bằng endpoint riêng của adapter và nạp đúng người dùng vào cache', async () => {
    const client = createTestQueryClient()

    await signInAndLoadUser(client, { username: 'an.nv', password: 'mat-khau-dai-123' })

    expect(client.getQueryData(['session', 'current'])).toMatchObject(expected)
    expect(tokenStore.hasSession()).toBe(true)
  })
})
