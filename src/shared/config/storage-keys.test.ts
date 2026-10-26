import { readFileSync } from 'node:fs'
import { STORAGE_KEYS, STORAGE_PREFIX } from './storage-keys'

test('mọi khóa localStorage bắt đầu bằng tiền tố chung', () => {
  for (const key of Object.values(STORAGE_KEYS)) {
    expect(key.startsWith(`${STORAGE_PREFIX}:`)).toBe(true)
  }
})

test('public/theme-init.js đọc đúng khóa STORAGE_KEYS.Theme', () => {
  const script = readFileSync('public/theme-init.js', 'utf8')

  expect(script).toContain(STORAGE_KEYS.Theme)
})
