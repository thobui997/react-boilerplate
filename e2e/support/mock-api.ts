import type { Page, Route } from '@playwright/test'

// Cùng biến với dev server (Vite đọc VITE_API_BASE từ môi trường hoặc `.env`; playwright.config.ts nạp `.env` vào
// process.env) để route giả lập khớp với URL mà app thật gọi. Mặc định giống src/shared/config/env.ts.
const API_BASE = (process.env.VITE_API_BASE || '/api/v1').replace(/\/+$/, '')
const API_PATH = new URL(API_BASE, 'http://localhost').pathname

// Mẫu glob của `page.route` cho một đường dẫn dưới API (ví dụ `/me`, `/items/**`).
export function apiGlob(path: string): string {
  return /^https?:\/\//.test(API_BASE) ? `${API_BASE}${path}` : `**${API_PATH}${path}`
}

export function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}

export function problem(route: Route, status: number, code: string, detail: string) {
  return route.fulfill({
    status,
    contentType: 'application/problem+json',
    body: JSON.stringify({ status, code, detail }),
  })
}

export const CREDENTIALS = { username: 'an.nv', password: 'Matkhau-12345' }

export interface MockApiOptions {
  // Quyền của người dùng trả về ở GET /me. Mặc định rỗng: sau đăng nhập về /settings, không phụ thuộc tính năng mẫu.
  permissions?: string[]
  // Mật khẩu tạm: GET /me báo phải đổi mật khẩu cho tới khi POST /auth/change-password thành công.
  mustChangePassword?: boolean
}

export interface MockApi {
  // Mỗi request tới API theo thứ tự, dạng `METHOD /đường-dẫn`, để test kiểm tra app đã gọi gì.
  requests: string[]
}

// Giả lập hợp đồng mặc định của template (defaultAdapter) để E2E chạy không cần backend. Có trạng thái đủ dùng:
// mật khẩu hiện tại và cờ mustChangePassword đổi sau khi đổi mật khẩu.
export async function mockApi(page: Page, options: MockApiOptions = {}): Promise<MockApi> {
  const state = {
    password: CREDENTIALS.password,
    mustChangePassword: options.mustChangePassword ?? false,
  }
  const requests: string[] = []

  await page.route(apiGlob('/**'), async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.slice(API_PATH.length)
    const method = request.method()
    requests.push(`${method} ${path}`)

    if (method === 'POST' && path === '/auth/login') {
      const body = request.postDataJSON() as { username?: string; password?: string }
      if (body.username !== CREDENTIALS.username || body.password !== state.password) {
        return problem(route, 401, 'invalid_credentials', 'Sai tên đăng nhập hoặc mật khẩu.')
      }
      return json(route, { accessToken: 'access-token', refreshToken: 'refresh-token' })
    }
    if (method === 'POST' && path === '/auth/logout') {
      return route.fulfill({ status: 204 })
    }
    if (method === 'POST' && path === '/auth/change-password') {
      const body = request.postDataJSON() as { currentPassword?: string; newPassword?: string }
      if (body.currentPassword !== state.password) {
        return problem(route, 401, 'invalid_credentials', 'Mật khẩu hiện tại không đúng.')
      }
      state.password = body.newPassword ?? state.password
      state.mustChangePassword = false
      return route.fulfill({ status: 204 })
    }
    if (method === 'GET' && path === '/me') {
      return json(route, {
        id: 'user-1',
        username: CREDENTIALS.username,
        fullName: 'Nguyễn Văn An',
        role: { id: 'role-member', name: 'member' },
        permissions: options.permissions ?? [],
        mustChangePassword: state.mustChangePassword,
      })
    }
    return problem(route, 404, 'not_found', `Chưa giả lập ${method} ${path}`)
  })

  return { requests }
}
