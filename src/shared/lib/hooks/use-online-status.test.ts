import { act, renderHook } from '@testing-library/react'
import { useOnlineStatus } from './use-online-status'

test('theo dõi sự kiện offline/online', () => {
  const { result } = renderHook(() => useOnlineStatus())
  expect(result.current).toBe(true)

  act(() => {
    window.dispatchEvent(new Event('offline'))
  })
  expect(result.current).toBe(false)

  act(() => {
    window.dispatchEvent(new Event('online'))
  })
  expect(result.current).toBe(true)
})
