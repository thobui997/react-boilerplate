import { fc, test } from '@fast-check/vitest'
import { safeRedirect } from './safe-redirect'

const FALLBACK = '/fallback'
const ORIGIN = 'https://app.test'

// Chuỗi tuỳ ý (kể cả điều khiển, không-ASCII) và chuỗi ghép từ đúng những ký tự mà URL parser xử lý đặc biệt:
// '/', '\', tab, xuống dòng, '.', ':', '@'. Cách thứ hai dễ sinh ra '//host' ngụy trang hơn chuỗi ngẫu nhiên thuần.
const anyString = fc.string({ unit: 'binary', maxLength: 40 })
const hostileString = fc
  .array(fc.constantFrom('/', '\\', '\t', '\n', '\r', '.', ':', '@', '?', '#', 'a', 'x.com'), {
    maxLength: 12,
  })
  .map((parts) => parts.join(''))
const candidate = fc.oneof(
  anyString,
  hostileString,
  hostileString.map((s) => `/${s}`),
  fc.constantFrom(null, undefined),
)

test.prop([candidate], { numRuns: 1000 })(
  'kết quả luôn là dự phòng hoặc đúng chuỗi đã cho, không bao giờ bị sửa',
  (next) => {
    const result = safeRedirect(next, FALLBACK)

    expect(result === FALLBACK || result === next).toBe(true)
  },
)

test.prop([candidate], { numRuns: 1000 })(
  'kết quả luôn cùng origin với ứng dụng (không chuyển hướng sang trang ngoài)',
  (next) => {
    const result = safeRedirect(next, FALLBACK)

    expect(new URL(result, ORIGIN).origin).toBe(ORIGIN)
  },
)

test.prop([candidate], { numRuns: 1000 })(
  'đường dẫn được nhận luôn bắt đầu bằng đúng một "/" và không có "\\" hay ký tự điều khiển',
  (next) => {
    const result = safeRedirect(next, FALLBACK)
    if (result === FALLBACK) return

    expect(result.startsWith('/')).toBe(true)
    expect(result.startsWith('//')).toBe(false)
    // eslint-disable-next-line no-control-regex -- kiểm đúng các ký tự điều khiển mà safeRedirect phải loại
    expect(/[\\\u0000-\u001f\u007f]/.test(result)).toBe(false)
  },
)

const safePath = fc
  .array(fc.constantFrom('a', 'b', 'z', '0', '9', '-', '_', '.', '/', '?', '=', '&', '%'), {
    maxLength: 20,
  })
  .map((parts) => parts.join(''))
  .filter((rest) => !rest.startsWith('/'))
  .map((rest) => `/${rest}`)

test.prop([safePath], { numRuns: 500 })('đường dẫn tương đối hợp lệ được giữ nguyên', (next) => {
  expect(safeRedirect(next, FALLBACK)).toBe(next)
})
