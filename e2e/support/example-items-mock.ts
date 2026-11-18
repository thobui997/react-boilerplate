import type { Page } from '@playwright/test'
import { apiGlob, json, problem } from './mock-api'

// Chỉ phục vụ tính năng mẫu example-item: gỡ cùng e2e/example-items.spec.ts khi gỡ tính năng mẫu
// (scripts/remove-example.mjs chỉ quét src/, xem docs/removing-example-item.md).
interface Wire {
  id: string
  name: string
  description: string
  created_at: string
}

// Đăng ký sau mockApi: route đăng ký sau được ưu tiên nên các đường dẫn này thắng route chung.
export async function mockExampleItems(page: Page): Promise<void> {
  let items: Wire[] = [
    { id: 'item-a', name: 'Mục A', description: 'Mô tả A', created_at: '2026-10-01T08:00:00Z' },
    { id: 'item-b', name: 'Mục B', description: 'Mô tả B', created_at: '2026-10-02T08:00:00Z' },
  ]
  let nextId = 1

  await page.route(apiGlob('/example-items'), (route) => {
    const request = route.request()
    if (request.method() === 'GET') return json(route, items)
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as { name: string; description?: string }
      const created: Wire = {
        id: `new-${nextId++}`,
        name: body.name,
        description: body.description ?? '',
        created_at: '2026-10-26T08:00:00Z',
      }
      items = [...items, created]
      return json(route, created, 201)
    }
    return route.fallback()
  })

  await page.route(apiGlob('/example-items/*'), (route) => {
    const request = route.request()
    if (request.method() !== 'DELETE') return route.fallback()
    const id = new URL(request.url()).pathname.split('/').pop()
    if (!items.some((item) => item.id === id)) {
      return problem(route, 404, 'not_found', 'Không tìm thấy mục.')
    }
    items = items.filter((item) => item.id !== id)
    return route.fulfill({ status: 204 })
  })
}
