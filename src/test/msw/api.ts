import { http, HttpResponse } from 'msw'
import { tokenStore, type AuthUser } from '@/shared/api'
import { env } from '@/shared/config'
import { makeMeDto, makeUser } from '@/test/fixtures/user'
import { server } from './server'

export function api(path: string): string {
  return `${env.apiBase}${path}`
}

// Đặt phiên đăng nhập giả: có token trong store và GET /me (endpoint fetchCurrentUser của adapter mặc định)
// trả đúng người dùng. Đổi adapter thì test tự đăng ký handler cho endpoint của adapter đó.
export function signInAs(overrides: Partial<AuthUser> = {}): AuthUser {
  const user = makeUser(overrides)
  tokenStore.setSession({ accessToken: 'test-access', refreshToken: 'test-refresh' })
  server.use(
    http.get(api('/me'), () =>
      HttpResponse.json(
        makeMeDto({
          id: user.id,
          username: user.username,
          fullName: user.displayName,
          role: { id: `role-${user.role}`, name: user.role },
          permissions: [...user.permissions],
          mustChangePassword: user.mustChangePassword,
        }),
      ),
    ),
  )
  return user
}
