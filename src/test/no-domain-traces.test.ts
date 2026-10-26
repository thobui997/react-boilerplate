import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// Template không được mang dấu vết nghiệp vụ của dự án gốc. Quét mọi file text trong repo
// (kể cả file chưa commit) trừ thư mục sinh ra/phụ thuộc và tài liệu nội bộ của quy trình.
// Không dùng `new URL(..., import.meta.url)`: dưới jsdom `URL` là bản của jsdom, `fileURLToPath` từ chối.
const SELF_PATH = fileURLToPath(import.meta.url)
const ROOT = resolve(dirname(SELF_PATH), '../..')
const SELF = relative(ROOT, SELF_PATH).split(sep).join('/')

const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.superpowers',
  'docs/superpowers',
  'playwright-report',
  'test-results',
])
const EXCLUDED_FILES = new Set(['package-lock.json', 'tsconfig.tsbuildinfo', SELF])

const DOMAIN_TRACE = /police|commune|\bbcx\b|Công an|ict-time|VITE_UNIT_NAME|báo cáo ngày/i

function listFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name)
    const rel = relative(ROOT, abs).split(sep).join('/')
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(rel) && !EXCLUDED_DIRS.has(entry.name)) files.push(...listFiles(abs))
    } else if (entry.isFile() && !EXCLUDED_FILES.has(rel)) {
      files.push(rel)
    }
  }
  return files
}

test('không file nào trong repo còn từ khóa nghiệp vụ của dự án gốc', () => {
  const files = listFiles(ROOT)
  expect(files).toContain('package.json')

  const offenders: string[] = []
  for (const rel of files) {
    const buffer = readFileSync(join(ROOT, rel))
    if (buffer.includes(0)) continue // file nhị phân
    const lines = buffer.toString('utf8').split('\n')
    lines.forEach((line, index) => {
      if (DOMAIN_TRACE.test(line)) offenders.push(`${rel}:${index + 1}: ${line.trim()}`)
    })
  }

  expect(offenders).toEqual([])
})
