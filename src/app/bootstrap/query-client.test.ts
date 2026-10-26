import { QueryObserver } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { sessionQueries } from '@/entities/session'
import { ApiError, tokenStore } from '@/shared/api'
import { api } from '@/test/msw/api'
import { makeMeDto } from '@/test/fixtures/user'
import { server } from '@/test/msw/server'
import { createQueryClient } from './query-client'

beforeEach(() => {
  tokenStore.setSession({ accessToken: 'a', refreshToken: 'r' })
})

afterEach(() => {
  tokenStore.clear()
})

test('GET thử lại một lần, mutation không tự thử lại, làm tươi khi quay lại tab/có mạng', () => {
  const defaults = createQueryClient().getDefaultOptions()

  expect(defaults.queries?.retry).toBe(1)
  expect(defaults.mutations?.retry).toBe(false)
  expect(defaults.queries?.refetchOnWindowFocus).toBe(true)
  expect(defaults.queries?.refetchOnReconnect).toBe(true)
})

test('mutation không xếp hàng chờ mạng: ngoại tuyến phải báo lỗi ngay, không tự nộp khi có mạng lại', () => {
  expect(createQueryClient().getDefaultOptions().mutations?.networkMode).toBe('always')
})

test('GET chạy cả khi ngoại tuyến để báo lỗi ngay thay vì treo chờ mạng', () => {
  expect(createQueryClient().getDefaultOptions().queries?.networkMode).toBe('always')
})

describe('403 forbidden làm mới phiên', () => {
  function countMeCalls() {
    const calls = { count: 0 }
    server.use(
      http.get(api('/me'), () => {
        calls.count++
        return HttpResponse.json(makeMeDto())
      }),
    )
    return calls
  }

  const forbidden = () => new ApiError({ status: 403, code: 'forbidden', detail: 'x' })

  test('truy vấn trả 403 forbidden khiến người dùng hiện tại được tải lại', async () => {
    const meCalls = countMeCalls()
    const client = createQueryClient()
    // invalidateQueries chỉ tải lại truy vấn đang có người xem: giả lập trang đang dùng phiên.
    const unsubscribe = new QueryObserver(client, sessionQueries.current()).subscribe(
      () => undefined,
    )
    await vi.waitFor(() => expect(meCalls.count).toBe(1))

    await client
      .fetchQuery({ queryKey: ['x'], retry: false, queryFn: () => Promise.reject(forbidden()) })
      .catch(() => undefined)

    await vi.waitFor(() => expect(meCalls.count).toBe(2))
    unsubscribe()
  })

  test('mutation trả 403 forbidden cũng làm mới phiên', async () => {
    const meCalls = countMeCalls()
    const client = createQueryClient()
    const unsubscribe = new QueryObserver(client, sessionQueries.current()).subscribe(
      () => undefined,
    )
    await vi.waitFor(() => expect(meCalls.count).toBe(1))

    await client
      .getMutationCache()
      .build(client, { mutationFn: () => Promise.reject(forbidden()) })
      .execute(undefined)
      .catch(() => undefined)

    await vi.waitFor(() => expect(meCalls.count).toBe(2))
    unsubscribe()
  })
})
