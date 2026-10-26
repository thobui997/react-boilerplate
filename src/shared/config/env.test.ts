import { requireEnv } from './env'

// `env` đọc import.meta.env lúc nạp module, còn Vitest nạp `.env` cục bộ: stub biến rồi nạp lại module để test không
// phụ thuộc `.env` của máy đang chạy.
async function loadEnvWith(apiBase: string) {
  vi.stubEnv('VITE_API_BASE', apiBase)
  vi.resetModules()
  return (await import('./env')).env
}

afterEach(() => {
  vi.unstubAllEnvs()
})

test('requireEnv ném lỗi chứa tên biến khi thiếu', () => {
  expect(() => requireEnv('X', {})).toThrow('X')
})

test('requireEnv trả giá trị khi có', () => {
  expect(requireEnv('X', { X: 'v' })).toBe('v')
})

test('requireEnv ném lỗi khi giá trị rỗng', () => {
  expect(() => requireEnv('X', { X: '' })).toThrow('X')
})

test('env.apiBase mặc định là /api/v1 khi không đặt VITE_API_BASE', async () => {
  expect((await loadEnvWith('')).apiBase).toBe('/api/v1')
})

test('env.apiBase lấy giá trị VITE_API_BASE khi có', async () => {
  expect((await loadEnvWith('/custom/base')).apiBase).toBe('/custom/base')
})

test('requireEnv mặc định đọc từ import.meta.env', () => {
  expect(() => requireEnv('VITE_KHONG_TON_TAI')).toThrow('VITE_KHONG_TON_TAI')
})
