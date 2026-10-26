import type { QueryClient } from '@tanstack/react-query'
import { redirect } from 'react-router'
import { landingPathFor, sessionQueries, type User } from '@/entities/session'
import { ApiError, HttpStatus, tokenStore } from '@/shared/api'
import { ROUTES } from '@/shared/config'
import { canAny, hasRole } from '@/shared/lib/access'
import { safeRedirect } from '@/shared/lib/safe-redirect'

// Điều kiện vào route. Khai báo cả hai thì người dùng phải thỏa cả hai.
export interface RouteRequires {
  roles?: readonly string[]
  anyPermission?: readonly string[]
}

type LoaderArgs = { request: Request }

function satisfies(user: User, { roles, anyPermission }: RouteRequires): boolean {
  return (!roles || hasRole(user, roles)) && (!anyPermission || canAny(user, anyPermission))
}

export function createLoaders(queryClient: QueryClient) {
  // Guard chỉ đọc phiên (cache người dùng hiện tại); dữ liệu của trang vẫn do TanStack Query trong component nắm.
  // Lỗi khác 401 (mất mạng, 5xx) được ném để RouteErrorBoundary hiện "Thử lại" thay vì đẩy người dùng về đăng nhập.
  async function getUser(): Promise<User | null> {
    // Không có phiên thì không cần hỏi server.
    if (!tokenStore.hasSession()) return null
    try {
      return await queryClient.ensureQueryData(sessionQueries.current())
    } catch (error) {
      if (error instanceof ApiError && error.status === HttpStatus.Unauthorized) return null
      throw error
    }
  }

  function toLogin(request: Request) {
    const { pathname, search } = new URL(request.url)
    const target = `${pathname}${search}`
    return redirect(
      target === ROUTES.Home ? ROUTES.Login : `${ROUTES.Login}?next=${encodeURIComponent(target)}`,
    )
  }

  // Loader cha/con chạy song song nên mọi loader áp cùng một thứ tự kiểm tra: phiên → đổi mật khẩu → quyền.
  // Thiếu quyền thì về landingPathFor; mọi đích của landingPathFor phải vào được mà không cần quyền người dùng
  // chưa có, nếu không sẽ chuyển hướng vòng.
  async function requireSession(request: Request, requires?: RouteRequires): Promise<User> {
    const user = await getUser()
    if (!user) throw toLogin(request)
    if (user.mustChangePassword) throw redirect(ROUTES.ChangePassword)
    if (requires && !satisfies(user, requires)) throw redirect(landingPathFor(user))
    return user
  }

  return {
    async sessionLoader({ request }: LoaderArgs) {
      await requireSession(request)
      return null
    },

    // Trang gốc không có nội dung riêng: chuyển tới trang đích theo quyền.
    async homeLoader({ request }: LoaderArgs) {
      const user = await requireSession(request)
      throw redirect(landingPathFor(user))
    },

    guard(requires: RouteRequires) {
      return async ({ request }: LoaderArgs) => {
        await requireSession(request, requires)
        return null
      }
    },

    async loginLoader({ request }: LoaderArgs) {
      const user = await getUser()
      if (!user) return null
      if (user.mustChangePassword) throw redirect(ROUTES.ChangePassword)
      const next = new URL(request.url).searchParams.get('next')
      throw redirect(safeRedirect(next, landingPathFor(user)))
    },

    async changePasswordLoader({ request }: LoaderArgs) {
      const user = await getUser()
      if (!user) throw toLogin(request)
      if (!user.mustChangePassword) throw redirect(landingPathFor(user))
      return null
    },
  }
}
