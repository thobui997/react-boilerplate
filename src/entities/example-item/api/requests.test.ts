import { http, HttpResponse } from 'msw'
import { api } from '@/test/msw/api'
import { server } from '@/test/msw/server'
import {
  createExampleItem,
  deleteExampleItem,
  listExampleItems,
  updateExampleItem,
} from './requests'

const dto = {
  id: 'i1',
  name: 'Mục A',
  description: 'Mô tả A',
  created_at: '2026-10-01T08:00:00Z',
}
const item = { id: 'i1', name: 'Mục A', description: 'Mô tả A', createdAt: '2026-10-01T08:00:00Z' }
const input = { name: 'Mục A', description: 'Mô tả A' }

test('listExampleItems gọi GET /example-items và trả danh sách đã map', async () => {
  let method = ''
  server.use(
    http.get(api('/example-items'), ({ request }) => {
      method = request.method
      return HttpResponse.json([dto])
    }),
  )

  await expect(listExampleItems()).resolves.toEqual([item])
  expect(method).toBe('GET')
})

test('createExampleItem gọi POST /example-items với name và description, trả mục đã map', async () => {
  let body: unknown
  server.use(
    http.post(api('/example-items'), async ({ request }) => {
      body = await request.json()
      return HttpResponse.json(dto, { status: 201 })
    }),
  )

  await expect(createExampleItem(input)).resolves.toEqual(item)
  expect(body).toEqual(input)
})

test('updateExampleItem gọi PUT /example-items/:id với name và description', async () => {
  let body: unknown
  server.use(
    http.put(api('/example-items/i1'), async ({ request }) => {
      body = await request.json()
      return HttpResponse.json(dto)
    }),
  )

  await expect(updateExampleItem('i1', input)).resolves.toEqual(item)
  expect(body).toEqual(input)
})

test('deleteExampleItem gọi DELETE /example-items/:id và chấp nhận 204', async () => {
  let method = ''
  server.use(
    http.delete(api('/example-items/i1'), ({ request }) => {
      method = request.method
      return new HttpResponse(null, { status: 204 })
    }),
  )

  await expect(deleteExampleItem('i1')).resolves.toBeUndefined()
  expect(method).toBe('DELETE')
})

test('lỗi của server được ném lại dưới dạng ApiError', async () => {
  server.use(
    http.get(api('/example-items'), () =>
      HttpResponse.json({ status: 500, code: 'internal_error', detail: 'x' }, { status: 500 }),
    ),
  )

  await expect(listExampleItems()).rejects.toMatchObject({ status: 500, code: 'internal_error' })
})
