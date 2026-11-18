import { fc, test } from '@fast-check/vitest'
import { QueryClient } from '@tanstack/react-query'
import { matchRoutes } from 'react-router'
import { landingPathFor, sessionQueries, type User } from '@/entities/session'
import { tokenStore } from '@/shared/api'
import { ROUTES } from '@/shared/config'
import { Permissions } from '@/shared/lib/access'
import { makeUser } from '@/test/fixtures/user'
import { createRoutes } from './routes'

type Loader = (args: { request: Request }) => Promise<unknown>

// Quyền thật của template cộng vài quyền lạ: người dùng của backend có thể mang quyền mà template không biết.
const KNOWN_PERMISSIONS: string[] = Object.values(Permissions)
const permissionSets = fc.subarray([...KNOWN_PERMISSIONS, 'other:read', 'other:write', ''])
const roles = fc.constantFrom('admin', 'member', 'guest')

// Chạy loader của mọi route khớp với đích, như router làm khi điều hướng tới đó. Trả về đường dẫn chuyển hướng
// (null nếu cho qua). Cùng cách dựng với `không vòng chuyển hướng` trong loaders.test.ts.
async function redirectsAt(user: User, path: string): Promise<(string | null)[]> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(sessionQueries.current().queryKey, user)
  tokenStore.setSession({ accessToken: 'a', refreshToken: 'r' })
  const loaders = (matchRoutes(createRoutes({ queryClient }), path) ?? []).flatMap(({ route }) =>
    typeof route.loader === 'function' ? [route.loader as unknown as Loader] : [],
  )
  return Promise.all(
    loaders.map(async (loader) => {
      try {
        await loader({ request: new Request(`http://localhost${path}`) })
        return null
      } catch (thrown) {
        if (thrown instanceof Response) return thrown.headers.get('Location')
        throw thrown
      }
    }),
  )
}

afterEach(() => {
  tokenStore.clear()
})

// Điều kiện của CLAUDE.md: mọi đích của landingPathFor phải vào được mà không cần quyền người dùng chưa có,
// nếu không guard chuyển hướng vòng. Các test ví dụ chỉ thử hai người dùng; ở đây thử mọi tổ hợp quyền.
test.prop([permissionSets, roles], { numRuns: 100 })(
  'mọi tổ hợp quyền: đích của landingPathFor qua được loader của chính nó, không chuyển hướng vòng',
  async (permissions, role) => {
    const user = makeUser({ permissions, role, mustChangePassword: false })
    const target = landingPathFor(user)

    expect(target.startsWith('/')).toBe(true)
    const redirects = await redirectsAt(user, target)
    expect(redirects.length).toBeGreaterThan(0)
    expect(redirects).toEqual(redirects.map(() => null))
  },
)

test.prop([permissionSets], { numRuns: 200 })(
  'đích không phụ thuộc thứ tự hay số lần lặp của quyền',
  (permissions) => {
    const user = makeUser({ permissions })
    const reordered = makeUser({ permissions: [...permissions, ...permissions].reverse() })

    expect(landingPathFor(reordered)).toBe(landingPathFor(user))
  },
)

test.prop([fc.subarray(['other:read', 'other:write', 'x:y', ''])], { numRuns: 100 })(
  'người dùng chỉ có quyền template không biết luôn về trang cài đặt',
  (permissions) => {
    expect(landingPathFor(makeUser({ permissions }))).toBe(ROUTES.Settings)
  },
)
