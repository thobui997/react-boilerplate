import { safeRedirect } from './safe-redirect'

const FALLBACK = '/'

describe('safeRedirect', () => {
  test.each(['/settings', '/settings?tab=profile', '/'])(
    'giữ đường dẫn tương đối hợp lệ %s',
    (next) => {
      expect(safeRedirect(next, FALLBACK)).toBe(next)
    },
  )

  // <example-item>
  test('giữ nguyên đường dẫn có query của trang ví dụ', () => {
    expect(safeRedirect('/example-items?page=2', FALLBACK)).toBe('/example-items?page=2')
  })
  // </example-item>

  test.each([
    '//evil.com',
    'https://evil.com',
    '/\\evil.com',
    'javascript:alert(1)',
    '',
    null,
    undefined,
    'settings',
    '/\t/evil.com',
    '/\n/evil.com',
  ])('chặn %j và dùng dự phòng', (next) => {
    expect(safeRedirect(next, FALLBACK)).toBe(FALLBACK)
  })
})
