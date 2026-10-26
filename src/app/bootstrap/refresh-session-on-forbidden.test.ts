import { ApiError } from '@/shared/api'
import { createSessionRefresher } from './refresh-session-on-forbidden'

function apiError(status: number, code: string) {
  return new ApiError({ status, code, detail: 'x' })
}

function setup() {
  let clock = 1_000_000
  const invalidate = vi.fn(() => Promise.resolve())
  const refresh = createSessionRefresher({ invalidate, now: () => clock })
  return {
    refresh,
    invalidate,
    advance: (ms: number) => {
      clock += ms
    },
  }
}

test('403 forbidden làm mới phiên một lần', () => {
  const { refresh, invalidate } = setup()
  refresh(apiError(403, 'forbidden'))
  expect(invalidate).toHaveBeenCalledTimes(1)
})

test('gọi lại sau 5 giây thì bỏ qua, sau 10 giây thì làm mới', () => {
  const { refresh, invalidate, advance } = setup()
  refresh(apiError(403, 'forbidden'))
  advance(5_000)
  refresh(apiError(403, 'forbidden'))
  expect(invalidate).toHaveBeenCalledTimes(1)
  advance(5_000)
  refresh(apiError(403, 'forbidden'))
  expect(invalidate).toHaveBeenCalledTimes(2)
})

test('403 với mã khác, 404 và lỗi không phải ApiError bị bỏ qua', () => {
  const { refresh, invalidate } = setup()
  refresh(apiError(403, 'password_change_required'))
  refresh(apiError(404, 'forbidden'))
  refresh(new Error('boom'))
  refresh(undefined)
  expect(invalidate).not.toHaveBeenCalled()
})

test('invalidate bị từ chối không gây lỗi chưa bắt', async () => {
  const invalidate = vi.fn(() => Promise.reject(new Error('x')))
  const refresh = createSessionRefresher({ invalidate, now: () => 0 })
  expect(() => refresh(apiError(403, 'forbidden'))).not.toThrow()
  await Promise.resolve()
})
