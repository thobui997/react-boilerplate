import type { Page, Route } from '@playwright/test'

const permissions: string[] = []
// <example-item>
permissions.push('item:read')
// </example-item>

const me = {
  id: 'user-1',
  username: 'an.nv',
  fullName: 'Nguyễn Văn An',
  role: { id: 'role-staff', name: 'staff' },
  permissions,
  mustChangePassword: false,
}

// <example-item>
const exampleItems = [
  {
    id: 'item-a',
    name: 'Mục A',
    description: 'Mô tả A',
    created_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 'item-b',
    name: 'Mục B',
    description: 'Mô tả B',
    created_at: '2026-10-02T08:00:00Z',
  },
]
// </example-item>

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

// Giả lập API mặc định của template để E2E chạy không cần backend.
export async function mockApi(page: Page): Promise<void> {
  await page.route('**/api/v1/**', (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace(/^\/api\/v1/, '')
    const method = request.method()

    if (method === 'POST' && path === '/auth/login') {
      return json(route, { accessToken: 'access-token', refreshToken: 'refresh-token' })
    }
    if (method === 'POST' && path === '/auth/logout') {
      return route.fulfill({ status: 204 })
    }
    if (method === 'GET' && path === '/me') {
      return json(route, me)
    }
    // <example-item>
    if (method === 'GET' && path === '/example-items') {
      return json(route, exampleItems)
    }
    // </example-item>
    return json(route, { message: `Chưa giả lập ${method} ${path}` }, 404)
  })
}
