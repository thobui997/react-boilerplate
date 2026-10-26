import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STORAGE_KEYS, STORAGE_PREFIX } from './storage-keys'

// Đường dẫn tính từ vị trí file test, không phụ thuộc thư mục chạy vitest.
const THEME_INIT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../public/theme-init.js',
)

test('mọi khóa localStorage bắt đầu bằng tiền tố chung', () => {
  for (const key of Object.values(STORAGE_KEYS)) {
    expect(key.startsWith(`${STORAGE_PREFIX}:`)).toBe(true)
  }
})

test('public/theme-init.js đọc đúng khóa STORAGE_KEYS.Theme', () => {
  const script = readFileSync(THEME_INIT_PATH, 'utf8')

  expect(script).toContain(STORAGE_KEYS.Theme)
})
