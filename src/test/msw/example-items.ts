import { http, HttpResponse } from 'msw'
import { env } from '@/shared/config'

// Backend giả trong bộ nhớ cho tính năng mẫu example-item. Hình dạng dây khai báo lại tại đây (không import DTO của
// entity: DTO chỉ dùng trong api/ của slice). Không import './api' để tránh vòng import handlers → api → server.
export interface ExampleItemWire {
  id: string
  name: string
  description: string
  created_at: string
}

const BASE = `${env.apiBase}/example-items`

let items: ExampleItemWire[] = []
let nextId = 1

export function resetExampleItems(): void {
  items = []
  nextId = 1
}

export function seedExampleItems(seed: ExampleItemWire[]): void {
  items = seed.map((item) => ({ ...item }))
}

export function makeExampleItemWire(overrides: Partial<ExampleItemWire> = {}): ExampleItemWire {
  return {
    id: 'item-a',
    name: 'Mục A',
    description: 'Mô tả A',
    created_at: '2026-10-01T08:00:00Z',
    ...overrides,
  }
}

interface InputBody {
  name?: unknown
  description?: unknown
}

function invalid(field: string, message: string) {
  return HttpResponse.json(
    {
      status: 422,
      code: 'validation_failed',
      detail: 'Dữ liệu không hợp lệ.',
      errors: { [field]: [{ code: 'invalid', message }] },
    },
    { status: 422 },
  )
}

const notFound = () =>
  HttpResponse.json(
    { status: 404, code: 'not_found', detail: 'Không tìm thấy mục.' },
    { status: 404 },
  )

function readInput(body: InputBody): { name: string; description: string } | null {
  if (typeof body.name !== 'string' || body.name.trim() === '') return null
  return {
    name: body.name,
    description: typeof body.description === 'string' ? body.description : '',
  }
}

export const exampleItemHandlers = [
  http.get(BASE, () => HttpResponse.json(items)),
  http.post(BASE, async ({ request }) => {
    const input = readInput((await request.json()) as InputBody)
    if (!input) return invalid('name', 'Cần nhập tên')
    const created: ExampleItemWire = {
      id: `item-${nextId++}`,
      ...input,
      created_at: '2026-10-26T08:00:00Z',
    }
    items = [...items, created]
    return HttpResponse.json(created, { status: 201 })
  }),
  http.put(`${BASE}/:id`, async ({ params, request }) => {
    const current = items.find((item) => item.id === params.id)
    if (!current) return notFound()
    const input = readInput((await request.json()) as InputBody)
    if (!input) return invalid('name', 'Cần nhập tên')
    const updated = { ...current, ...input }
    items = items.map((item) => (item.id === current.id ? updated : item))
    return HttpResponse.json(updated)
  }),
  http.delete(`${BASE}/:id`, ({ params }) => {
    if (!items.some((item) => item.id === params.id)) return notFound()
    items = items.filter((item) => item.id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),
]
