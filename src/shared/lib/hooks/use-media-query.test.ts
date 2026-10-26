import { act, renderHook } from '@testing-library/react'
import { useMediaQuery } from './use-media-query'

function stubMatchMedia(initial: boolean) {
  let matches = initial
  const listeners = new Set<() => void>()
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return matches
      },
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    })),
  )
  return (next: boolean) => {
    matches = next
    listeners.forEach((listener) => listener())
  }
}

afterEach(() => vi.unstubAllGlobals())

test('không có matchMedia thì coi là khớp', () => {
  const { result } = renderHook(() => useMediaQuery('(min-width: 600px)'))

  expect(result.current).toBe(true)
})

test('đọc giá trị ban đầu và cập nhật khi truy vấn đổi', () => {
  const setMatches = stubMatchMedia(false)
  const { result } = renderHook(() => useMediaQuery('(min-width: 600px)'))
  expect(result.current).toBe(false)

  act(() => setMatches(true))

  expect(result.current).toBe(true)
})
