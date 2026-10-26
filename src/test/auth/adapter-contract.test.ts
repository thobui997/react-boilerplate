import { http as mswHttp, HttpResponse } from 'msw'
import { createHttpClient, defaultAdapter, type AuthAdapter } from '@/shared/api'
import { server } from '@/test/msw/server'
import { api } from '@/test/msw/api'
import { accessOnlyAdapter } from './access-only-adapter'

interface Case {
  name: string
  adapter: AuthAdapter
  mock: () => void
}

const cases: Case[] = [
  {
    name: 'defaultAdapter',
    adapter: defaultAdapter,
    mock: () =>
      server.use(
        mswHttp.post(api('/auth/login'), () =>
          HttpResponse.json({ accessToken: 'acc', refreshToken: 'ref' }),
        ),
        mswHttp.get(api('/me'), () =>
          HttpResponse.json({
            id: '1',
            username: 'u',
            fullName: 'User One',
            role: { id: 'r1', name: 'admin' },
            permissions: ['x'],
            mustChangePassword: false,
          }),
        ),
      ),
  },
  {
    name: 'accessOnlyAdapter',
    adapter: accessOnlyAdapter,
    mock: () =>
      server.use(
        mswHttp.post(api('/session/start'), () => HttpResponse.json({ token: 'acc' })),
        mswHttp.get(api('/session/me'), () =>
          HttpResponse.json({ uid: '1', name: 'User One', roles: ['admin'], perms: ['x'] }),
        ),
      ),
  },
]

describe.each(cases)('hợp đồng AuthAdapter: $name', ({ adapter, mock }) => {
  test('unauthenticatedPaths không rỗng', () => {
    expect(adapter.unauthenticatedPaths.length).toBeGreaterThan(0)
  })

  test('login trả accessToken là chuỗi không rỗng', async () => {
    mock()

    const tokens = await adapter.login(createHttpClient(), { username: 'u', password: 'p' })

    expect(typeof tokens.accessToken).toBe('string')
    expect(tokens.accessToken).not.toBe('')
  })

  test('fetchCurrentUser trả AuthUser đủ 6 trường đúng kiểu', async () => {
    mock()

    const user = await adapter.fetchCurrentUser(createHttpClient())

    expect(typeof user.id).toBe('string')
    expect(typeof user.username).toBe('string')
    expect(typeof user.displayName).toBe('string')
    expect(typeof user.role).toBe('string')
    expect(Array.isArray(user.permissions)).toBe(true)
    expect(typeof user.mustChangePassword).toBe('boolean')
  })
})
