import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { exampleItemQueries } from '@/entities/example-item'
import { setNotifier, type Notifier } from '@/shared/lib/notify'
import { api } from '@/test/msw/api'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/query-client'
import { createQueryWrapper } from '@/test/wrapper'
import {
  useCreateExampleItemMutation,
  useDeleteExampleItemMutation,
  useUpdateExampleItemMutation,
} from './mutations'

const notifier = { info: vi.fn(), success: vi.fn(), error: vi.fn() } satisfies Notifier
const input = { name: 'Mục A', description: 'Mô tả A' }
const dto = { id: 'i1', ...input, created_at: '2026-10-01T08:00:00Z' }

beforeEach(() => {
  vi.clearAllMocks()
  setNotifier(notifier)
})

afterEach(() => {
  setNotifier(null)
})

function setup<T>(useHook: () => T) {
  const client = createTestQueryClient()
  client.setQueryData(exampleItemQueries.list().queryKey, [])
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const view = renderHook(useHook, { wrapper: createQueryWrapper(client) })
  return { ...view, invalidate }
}

test('tạo thành công: báo thành công và làm mới mọi truy vấn của example-items', async () => {
  server.use(http.post(api('/example-items'), () => HttpResponse.json(dto, { status: 201 })))
  const { result, invalidate } = setup(useCreateExampleItemMutation)

  await result.current.mutateAsync(input)

  expect(notifier.success).toHaveBeenCalledWith('Đã thêm mục')
  await waitFor(() =>
    expect(invalidate).toHaveBeenCalledWith({ queryKey: exampleItemQueries.all() }),
  )
})

test('sửa thành công: báo thành công và làm mới truy vấn', async () => {
  server.use(http.put(api('/example-items/i1'), () => HttpResponse.json(dto)))
  const { result, invalidate } = setup(useUpdateExampleItemMutation)

  await result.current.mutateAsync({ id: 'i1', input })

  expect(notifier.success).toHaveBeenCalledWith('Đã lưu thay đổi')
  await waitFor(() =>
    expect(invalidate).toHaveBeenCalledWith({ queryKey: exampleItemQueries.all() }),
  )
})

test('xóa thành công: báo thành công và làm mới truy vấn', async () => {
  server.use(http.delete(api('/example-items/i1'), () => new HttpResponse(null, { status: 204 })))
  const { result, invalidate } = setup(useDeleteExampleItemMutation)

  await result.current.mutateAsync('i1')

  expect(notifier.success).toHaveBeenCalledWith('Đã xóa mục')
  await waitFor(() =>
    expect(invalidate).toHaveBeenCalledWith({ queryKey: exampleItemQueries.all() }),
  )
})

test('lỗi: báo lỗi bằng detail của server, không báo thành công, không làm mới', async () => {
  server.use(
    http.post(api('/example-items'), () =>
      HttpResponse.json(
        { status: 409, code: 'conflict', detail: 'Tên đã tồn tại.' },
        { status: 409 },
      ),
    ),
  )
  const { result, invalidate } = setup(useCreateExampleItemMutation)

  await expect(result.current.mutateAsync(input)).rejects.toMatchObject({ code: 'conflict' })

  expect(notifier.error).toHaveBeenCalledWith('Tên đã tồn tại.')
  expect(notifier.success).not.toHaveBeenCalled()
  expect(invalidate).not.toHaveBeenCalled()
})
