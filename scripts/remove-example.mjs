#!/usr/bin/env node
// Gỡ tính năng mẫu `example-item` khỏi dự án tạo từ template.
//
//   node scripts/remove-example.mjs [rootDir]
//
// 1. Xóa các thư mục/file chỉ thuộc tính năng mẫu (EXAMPLE_PATHS).
// 2. Cắt mọi đoạn nằm giữa hai dòng marker `// <example-item>` … `// </example-item>` (gồm cả hai dòng marker)
//    trong file .ts/.tsx/.js/.jsx/.mjs ở `src/`, `e2e/` và `steiger.config.ts`.
// 3. Chạy Prettier của repo trên các file đã sửa (cắt xong có thể còn `{\n}` hay `[\n]` thừa dòng).
//
// Kiểm tra toàn bộ marker trước khi ghi: marker mở thiếu đóng, đóng thừa, lồng nhau hoặc marker không đứng
// riêng một dòng comment đều làm script dừng với lỗi và không file nào bị sửa.
// Chỉ dùng module có sẵn của Node và Prettier đã cài trong repo.
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'

const EXAMPLE_PATHS = [
  'src/entities/example-item',
  'src/pages/example-items',
  'src/test/msw/example-items.ts',
]
const SCAN_DIRS = ['src', 'e2e']
const SCAN_FILES = ['steiger.config.ts']
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs'])
const SKIP_DIRS = new Set(['node_modules', 'dist'])

const START_MARKER = /^\s*\/\/\s*<example-item>\s*$/
const END_MARKER = /^\s*\/\/\s*<\/example-item>\s*$/
const ANY_MARKER = /<\/?example-item>/

const rootDir = resolve(process.argv[2] ?? process.cwd())
const toRel = (abs) => relative(rootDir, abs).split(sep).join('/')

class MarkerError extends Error {}

function listSourceFiles(dir) {
  if (!existsSync(dir)) return []
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) files.push(...listSourceFiles(abs))
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) {
      files.push(abs)
    }
  }
  return files
}

// Trả về nội dung đã cắt và danh sách khối bị cắt; ném MarkerError nếu marker sai cấu trúc.
function stripMarkers(text, rel) {
  const lines = text.split('\n')
  const kept = []
  const blocks = []
  let openAt = -1
  lines.forEach((line, index) => {
    const lineNo = index + 1
    if (START_MARKER.test(line)) {
      if (openAt !== -1) {
        throw new MarkerError(`${rel}:${lineNo}: marker mở lồng trong khối mở ở dòng ${openAt}`)
      }
      openAt = lineNo
    } else if (END_MARKER.test(line)) {
      if (openAt === -1) throw new MarkerError(`${rel}:${lineNo}: marker đóng không có marker mở`)
      blocks.push({ from: openAt, to: lineNo })
      openAt = -1
    } else if (ANY_MARKER.test(line)) {
      throw new MarkerError(`${rel}:${lineNo}: marker phải đứng riêng một dòng comment \`//\``)
    } else if (openAt === -1) {
      kept.push(line)
    }
  })
  if (openAt !== -1) throw new MarkerError(`${rel}:${openAt}: marker mở không có marker đóng`)
  return { text: kept.join('\n'), blocks }
}

function runPrettier(files) {
  const require = createRequire(join(rootDir, 'package.json'))
  let prettierBin
  try {
    const pkgPath = require.resolve('prettier/package.json')
    const { bin } = JSON.parse(readFileSync(pkgPath, 'utf8'))
    prettierBin = join(dirname(pkgPath), typeof bin === 'string' ? bin : bin.prettier)
  } catch {
    console.warn(
      '! Không tìm thấy prettier trong node_modules; hãy chạy `npm run format` sau khi cài.',
    )
    return
  }
  const result = spawnSync(process.execPath, [prettierBin, '--write', ...files], {
    cwd: rootDir,
    stdio: 'inherit',
  })
  if (result.status !== 0) throw new Error('Prettier thất bại trên các file vừa sửa.')
}

function main() {
  if (!existsSync(join(rootDir, 'package.json'))) {
    throw new Error(`${rootDir} không phải thư mục gốc dự án (thiếu package.json).`)
  }

  const exampleAbs = EXAMPLE_PATHS.map((p) => join(rootDir, p))
  const isExamplePath = (abs) => exampleAbs.some((p) => abs === p || abs.startsWith(p + sep))
  const candidates = [
    ...SCAN_DIRS.flatMap((dir) => listSourceFiles(join(rootDir, dir))),
    ...SCAN_FILES.map((file) => join(rootDir, file)).filter((abs) => existsSync(abs)),
  ].filter((abs) => !isExamplePath(abs))

  // Lượt 1: kiểm tra và tính kết quả cho mọi file, chưa ghi gì.
  const edits = []
  for (const abs of candidates) {
    const original = readFileSync(abs, 'utf8')
    if (!ANY_MARKER.test(original)) continue
    const { text, blocks } = stripMarkers(original, toRel(abs))
    if (blocks.length > 0) edits.push({ abs, text, blocks })
  }

  // Lượt 2: xóa thư mục/file mẫu rồi ghi các file đã cắt.
  let removedAnything = false
  for (const abs of exampleAbs) {
    if (!existsSync(abs)) continue
    rmSync(abs, { recursive: true, force: true })
    removedAnything = true
    console.log(`- đã xóa ${toRel(abs)}`)
  }
  for (const { abs, text, blocks } of edits) {
    writeFileSync(abs, text)
    removedAnything = true
    const ranges = blocks.map((b) => `${b.from}-${b.to}`).join(', ')
    console.log(`- ${toRel(abs)}: cắt ${blocks.length} khối example-item (dòng ${ranges})`)
  }

  if (!removedAnything) {
    console.log('Không còn gì của example-item để gỡ.')
    return
  }
  if (edits.length > 0) runPrettier(edits.map((e) => toRel(e.abs)))
  console.log(
    'Đã gỡ example-item. Chạy `npm run typecheck && npm run lint && npm test` để kiểm tra.',
  )
}

try {
  main()
} catch (error) {
  console.error(`remove-example: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
