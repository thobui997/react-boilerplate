import { renderHook } from '@testing-library/react'
import { useDebouncedCallback } from './use-debounced-callback'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

test('ba lần gọi trong 400ms chỉ chạy một lần với đối số cuối', () => {
  const fn = vi.fn()
  const { result } = renderHook(() => useDebouncedCallback(fn, 400))

  result.current('a')
  vi.advanceTimersByTime(100)
  result.current('b')
  vi.advanceTimersByTime(100)
  result.current('c')
  vi.advanceTimersByTime(399)
  expect(fn).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1)

  expect(fn).toHaveBeenCalledTimes(1)
  expect(fn).toHaveBeenCalledWith('c')
})

test('flush chạy ngay tác vụ đang chờ, một lần', () => {
  const fn = vi.fn()
  const { result } = renderHook(() => useDebouncedCallback(fn, 400))

  result.current('x')
  result.current.flush()
  vi.advanceTimersByTime(1000)

  expect(fn).toHaveBeenCalledTimes(1)
  expect(fn).toHaveBeenCalledWith('x')
})

test('flush khi không có gì chờ thì không làm gì', () => {
  const fn = vi.fn()
  const { result } = renderHook(() => useDebouncedCallback(fn, 400))

  result.current.flush()

  expect(fn).not.toHaveBeenCalled()
})

test('cancel huỷ tác vụ đang chờ', () => {
  const fn = vi.fn()
  const { result } = renderHook(() => useDebouncedCallback(fn, 400))

  result.current('x')
  result.current.cancel()
  vi.advanceTimersByTime(1000)

  expect(fn).not.toHaveBeenCalled()
})

test('unmount huỷ tác vụ chờ, không gọi fn', () => {
  const fn = vi.fn()
  const { result, unmount } = renderHook(() => useDebouncedCallback(fn, 400))

  result.current('x')
  unmount()
  vi.advanceTimersByTime(1000)

  expect(fn).not.toHaveBeenCalled()
})

test('luôn gọi phiên bản fn mới nhất', () => {
  const first = vi.fn()
  const second = vi.fn()
  const { result, rerender } = renderHook(({ fn }) => useDebouncedCallback(fn, 400), {
    initialProps: { fn: first },
  })

  result.current('x')
  rerender({ fn: second })
  vi.advanceTimersByTime(400)

  expect(first).not.toHaveBeenCalled()
  expect(second).toHaveBeenCalledWith('x')
})

test('flushOnUnmount: unmount chạy nốt tác vụ đang chờ thay vì bỏ', () => {
  const fn = vi.fn()
  const { result, unmount } = renderHook(() =>
    useDebouncedCallback(fn, 400, { flushOnUnmount: true }),
  )

  result.current('x')
  unmount()

  expect(fn).toHaveBeenCalledTimes(1)
  expect(fn).toHaveBeenCalledWith('x')
})

test('flushOnUnmount: cancel() trước khi unmount thì không chạy', () => {
  const fn = vi.fn()
  const { result, unmount } = renderHook(() =>
    useDebouncedCallback(fn, 400, { flushOnUnmount: true }),
  )

  result.current('x')
  result.current.cancel()
  unmount()

  expect(fn).not.toHaveBeenCalled()
})
