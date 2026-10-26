import { QueryClient } from '@tanstack/react-query'
import { matchRoutes } from 'react-router'
import { landingPathFor, sessionQueries, type User } from '@/entities/session'
import { ApiError, tokenStore } from '@/shared/api'
import { ROUTES } from '@/shared/config'
import { makeUser } from '@/test/fixtures/user'
import { createLoaders } from './loaders'
import { createRoutes } from './routes'

type Loaders = ReturnType<typeof createLoaders>
type Loader = (args: { request: Request }) => Promise<unknown>

const request = (path: string) => new Request(`http://localhost${path}`)

function setup(user: User | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  tokenStore.clear()
  if (user) {
    queryClient.setQueryData(sessionQueries.current().queryKey, user)
    tokenStore.setSession({ accessToken: 'a', refreshToken: 'r' })
  }
  return { queryClient, loaders: createLoaders(queryClient) }
}

// Chạy loader; trả về đường dẫn chuyển hướng (kể cả query) hoặc null nếu cho qua.
async function redirectOf(loader: Loader, path = '/x'): Promise<string | null> {
  try {
    await loader({ request: request(path) })
    return null
  } catch (thrown) {
    if (thrown instanceof Response) return thrown.headers.get('Location')
    throw thrown
  }
}

async function guardRedirect(
  user: User,
  run: (loaders: Loaders) => Loader,
  path = '/x',
): Promise<string | null> {
  return redirectOf(run(setup(user).loaders), path)
}

afterEach(() => {
  tokenStore.clear()
})

describe('guard', () => {
  test('thiếu quyền thì chuyển tới landingPathFor', async () => {
    const user = makeUser({ permissions: [] })

    expect(await guardRedirect(user, (l) => l.guard({ anyPermission: ['nobody:has'] }))).toBe(
      landingPathFor(user),
    )
  })

  test('có một trong các quyền thì cho qua', async () => {
    const user = makeUser({ permissions: ['b:read'] })

    expect(await guardRedirect(user, (l) => l.guard({ anyPermission: ['a:read', 'b:read'] }))).toBe(
      null,
    )
  })

  test('sai vai trò thì chuyển tới landingPathFor', async () => {
    const user = makeUser({ role: 'member' })

    expect(await guardRedirect(user, (l) => l.guard({ roles: ['admin'] }))).toBe(
      landingPathFor(user),
    )
  })

  test('có cả roles lẫn anyPermission thì phải thỏa cả hai', async () => {
    const requires = { roles: ['admin'], anyPermission: ['a:read'] }
    const admin = (permissions: string[]) => makeUser({ role: 'admin', permissions })

    expect(await guardRedirect(admin(['a:read']), (l) => l.guard(requires))).toBeNull()
    expect(await guardRedirect(admin([]), (l) => l.guard(requires))).toBe(landingPathFor(admin([])))
    expect(
      await guardRedirect(makeUser({ role: 'member', permissions: ['a:read'] }), (l) =>
        l.guard(requires),
      ),
    ).not.toBeNull()
  })

  test('đổi mật khẩu được kiểm trước quyền', async () => {
    const user = makeUser({ mustChangePassword: true, permissions: [] })

    expect(await guardRedirect(user, (l) => l.guard({ anyPermission: ['nobody:has'] }))).toBe(
      ROUTES.ChangePassword,
    )
  })

  test('chưa đăng nhập: về /login kèm next', async () => {
    const { loaders } = setup(null)

    expect(await redirectOf(loaders.guard({}), '/a/b?c=1')).toBe('/login?next=%2Fa%2Fb%3Fc%3D1')
  })
})

describe('không vòng chuyển hướng', () => {
  // Chạy loader của mọi route khớp với đích (như router làm khi điều hướng tới đó): đích phải cho qua.
  async function destinationRedirects(user: User, path: string): Promise<(string | null)[]> {
    const { queryClient } = setup(user)
    const matches = matchRoutes(createRoutes({ queryClient }), path) ?? []
    const loaders = matches.flatMap(({ route }) =>
      typeof route.loader === 'function' ? [route.loader as unknown as Loader] : [],
    )
    expect(loaders.length).toBeGreaterThan(0)
    return Promise.all(loaders.map((loader) => redirectOf(loader, path)))
  }

  test('người dùng không có quyền: đích của guard qua được loader của chính nó', async () => {
    const user = makeUser({ permissions: [] })
    const target = await guardRedirect(user, (l) => l.guard({ anyPermission: ['nobody:has'] }))

    expect(target).toBe(landingPathFor(user))
    const results = await destinationRedirects(user, target!)
    expect(results).toEqual(results.map(() => null))
  })
})

describe('sessionLoader / homeLoader', () => {
  test('chưa đăng nhập vào / thì về /login không kèm next', async () => {
    const { loaders } = setup(null)

    expect(await redirectOf(loaders.sessionLoader, '/')).toBe(ROUTES.Login)
  })

  test('mustChangePassword thì về /change-password', async () => {
    const { loaders } = setup(makeUser({ mustChangePassword: true }))

    expect(await redirectOf(loaders.sessionLoader, '/')).toBe(ROUTES.ChangePassword)
  })

  test('homeLoader chuyển tới landingPathFor', async () => {
    const user = makeUser()
    const { loaders } = setup(user)

    expect(await redirectOf(loaders.homeLoader, '/')).toBe(landingPathFor(user))
  })

  test('API trả 401 khi lấy người dùng thì coi như chưa đăng nhập', async () => {
    const { queryClient, loaders } = setup(null)
    tokenStore.setSession({ accessToken: 'a', refreshToken: 'r' })
    vi.spyOn(queryClient, 'ensureQueryData').mockRejectedValue(
      new ApiError({ status: 401, code: 'unauthorized', detail: 'x' }),
    )

    expect(await redirectOf(loaders.sessionLoader, '/a')).toBe('/login?next=%2Fa')
  })

  test.each([
    ['5xx', new ApiError({ status: 500, code: 'internal_error', detail: 'x' })],
    ['mất mạng', new ApiError({ status: 0, code: 'network_error', detail: 'x', isNetwork: true })],
  ])('lỗi %s khi lấy người dùng được ném ra, không chuyển về login', async (_label, error) => {
    const { queryClient, loaders } = setup(null)
    tokenStore.setSession({ accessToken: 'a', refreshToken: 'r' })
    vi.spyOn(queryClient, 'ensureQueryData').mockRejectedValue(error)

    await expect(loaders.sessionLoader({ request: request('/a') })).rejects.toBe(error)
  })
})

describe('loginLoader / changePasswordLoader', () => {
  test('loginLoader: chưa đăng nhập thì ở lại trang đăng nhập', async () => {
    const { loaders } = setup(null)

    expect(await redirectOf(loaders.loginLoader, '/login')).toBeNull()
  })

  test.each(['/a/b', '//evil.com', 'https://evil.com'])(
    'loginLoader: đã đăng nhập, next=%s',
    async (next) => {
      const user = makeUser()
      const { loaders } = setup(user)
      const expected = next === '/a/b' ? '/a/b' : landingPathFor(user)

      expect(await redirectOf(loaders.loginLoader, `/login?next=${encodeURIComponent(next)}`)).toBe(
        expected,
      )
    },
  )

  test('loginLoader: phải đổi mật khẩu thì về /change-password', async () => {
    const { loaders } = setup(makeUser({ mustChangePassword: true }))

    expect(await redirectOf(loaders.loginLoader, '/login')).toBe(ROUTES.ChangePassword)
  })

  test('changePasswordLoader: chưa đăng nhập về /login kèm next', async () => {
    const { loaders } = setup(null)

    expect(await redirectOf(loaders.changePasswordLoader, '/change-password')).toBe(
      '/login?next=%2Fchange-password',
    )
  })

  test('changePasswordLoader: không bắt buộc đổi thì về landingPathFor, bắt buộc thì cho qua', async () => {
    const user = makeUser()

    expect(await redirectOf(setup(user).loaders.changePasswordLoader)).toBe(landingPathFor(user))
    expect(
      await redirectOf(setup(makeUser({ mustChangePassword: true })).loaders.changePasswordLoader),
    ).toBeNull()
  })
})
