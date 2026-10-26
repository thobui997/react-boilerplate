import { env, requireEnv } from './env'

test('requireEnv ném lỗi chứa tên biến khi thiếu', () => {
  expect(() => requireEnv('X', {})).toThrow('X')
})

test('requireEnv trả giá trị khi có', () => {
  expect(requireEnv('X', { X: 'v' })).toBe('v')
})

test('requireEnv ném lỗi khi giá trị rỗng', () => {
  expect(() => requireEnv('X', { X: '' })).toThrow('X')
})

test('env.apiBase mặc định là /api/v1 khi không đặt VITE_API_BASE', () => {
  expect(env.apiBase).toBe('/api/v1')
})

test('requireEnv mặc định đọc từ import.meta.env', () => {
  expect(() => requireEnv('VITE_KHONG_TON_TAI')).toThrow('VITE_KHONG_TON_TAI')
})
