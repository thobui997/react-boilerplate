import { act, renderHook } from '@testing-library/react'

import { STORAGE_KEYS } from '@/shared/config'

const THEME_KEY = STORAGE_KEYS.Theme

function mockPrefersDark(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' && prefersDark,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

// Store giữ lựa chọn trong bộ nhớ nên mỗi test nạp module mới.
async function loadStore() {
  vi.resetModules()
  return import('./index')
}

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('theme mặc định', () => {
  test('theo prefers-color-scheme: dark', async () => {
    mockPrefersDark(true)
    const { getTheme } = await loadStore()

    expect(getTheme()).toBe('dark')
  })

  test('theo prefers-color-scheme: light', async () => {
    mockPrefersDark(false)
    const { getTheme } = await loadStore()

    expect(getTheme()).toBe('light')
  })

  test('lựa chọn đã lưu thắng prefers-color-scheme', async () => {
    mockPrefersDark(true)
    localStorage.setItem(THEME_KEY, 'light')
    const { getTheme } = await loadStore()

    expect(getTheme()).toBe('light')
  })

  test('giá trị lưu không hợp lệ bị bỏ qua', async () => {
    mockPrefersDark(false)
    localStorage.setItem(THEME_KEY, 'neon')
    const { getTheme } = await loadStore()

    expect(getTheme()).toBe('light')
  })
})

describe('setTheme', () => {
  test('ghi localStorage và đặt data-theme trên <html>', async () => {
    mockPrefersDark(false)
    const { setTheme } = await loadStore()

    setTheme('dark')

    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  test('useTheme cập nhật khi setTheme', async () => {
    mockPrefersDark(false)
    const { setTheme, useTheme } = await loadStore()
    const { result } = renderHook(() => useTheme())
    expect(result.current).toBe('light')

    act(() => setTheme('dark'))

    expect(result.current).toBe('dark')
  })

  test('localStorage ném lỗi vẫn đổi theme trong bộ nhớ và không throw', async () => {
    mockPrefersDark(false)
    const { getTheme, setTheme } = await loadStore()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })

    expect(() => setTheme('dark')).not.toThrow()

    expect(getTheme()).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  test('localStorage không đọc được thì getTheme vẫn trả theme theo hệ thống', async () => {
    mockPrefersDark(true)
    const { getTheme } = await loadStore()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })

    expect(getTheme()).toBe('dark')
  })
})
