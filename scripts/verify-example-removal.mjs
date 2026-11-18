#!/usr/bin/env node
// Kiểm tra rằng gỡ `example-item` vẫn để lại một dự án xanh, không đụng vào repo đang làm việc.
//
//   npm run verify:example-removal   (hoặc: node scripts/verify-example-removal.mjs)
//
// Sao chép cây làm việc (trừ node_modules, .git, dist, ...) vào một thư mục tạm, symlink node_modules
// từ repo gốc, chạy `scripts/remove-example.mjs` ở bản sao, kiểm tra không còn tham chiếu tới example-item
// rồi chạy `npm run typecheck`, `lint`, `format:check`, `npm test`, `npm run build`.
// Exit 0 chỉ khi mọi bước xanh. Thư mục tạm luôn được xóa khi kết thúc.
// Không nằm trong `npm test`/CI vì chạy lâu (cả bộ test + build).
// Lưu ý: Vite/Vitest ghi cache vào `node_modules/.vite` của repo gốc (qua symlink); vô hại.
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const EXCLUDED = new Set([
  'node_modules',
  '.git',
  'dist',
  '.superpowers',
  'test-results',
  'playwright-report',
  'coverage',
  'tsconfig.tsbuildinfo',
])
const STEPS = [
  ['run', 'typecheck'],
  ['run', 'lint'],
  ['run', 'format:check'],
  ['test'],
  ['run', 'build'],
]
const LEFTOVER = /example-?items?\b|exampleItem|ExampleItem/
const LEFTOVER_SCAN = ['src', 'e2e', 'steiger.config.ts']

function run(command, args, cwd) {
  console.log(`\n$ ${[command, ...args].join(' ')}`)
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  return result.status === 0
}

function findLeftovers(root) {
  const hits = []
  const visit = (abs) => {
    if (!existsSync(abs) || basename(abs) === 'node_modules') return
    const stat = lstatSync(abs)
    if (stat.isDirectory()) {
      for (const child of readdirSync(abs)) visit(join(abs, child))
    } else if (stat.isFile()) {
      readFileSync(abs, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (LEFTOVER.test(line)) {
            hits.push(`${relative(root, abs).split(sep).join('/')}:${index + 1}: ${line.trim()}`)
          }
        })
    }
  }
  for (const target of LEFTOVER_SCAN) visit(join(root, target))
  return hits
}

function verify(workDir) {
  console.log(`Sao chép repo vào ${workDir}`)
  cpSync(repoRoot, workDir, {
    recursive: true,
    filter: (src) => {
      const rel = relative(repoRoot, src)
      return rel === '' || !EXCLUDED.has(rel.split(sep)[0])
    },
  })
  const nodeModules = join(repoRoot, 'node_modules')
  if (!existsSync(nodeModules))
    throw new Error('Thiếu node_modules ở repo gốc; chạy `npm ci` trước.')
  symlinkSync(
    nodeModules,
    join(workDir, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  )

  if (!run(process.execPath, [join('scripts', 'remove-example.mjs')], workDir)) {
    throw new Error('remove-example.mjs thất bại.')
  }

  const leftovers = findLeftovers(workDir)
  if (leftovers.length > 0) {
    throw new Error(`Còn tham chiếu tới example-item sau khi gỡ:\n${leftovers.join('\n')}`)
  }
  console.log('\nKhông còn tham chiếu tới example-item trong src/, e2e/, steiger.config.ts.')

  for (const args of STEPS) {
    if (!run('npm', args, workDir))
      throw new Error(`\`npm ${args.join(' ')}\` thất bại sau khi gỡ.`)
  }
}

const workDir = mkdtempSync(join(tmpdir(), 'example-removal-'))
const cleanup = () => rmSync(workDir, { recursive: true, force: true })
process.on('SIGINT', () => {
  cleanup()
  process.exit(130)
})

try {
  verify(workDir)
  console.log(
    '\nverify-example-removal: OK — gỡ example-item xong vẫn typecheck, lint, format, test, build xanh.',
  )
} catch (error) {
  console.error(
    `\nverify-example-removal: FAIL — ${error instanceof Error ? error.message : String(error)}`,
  )
  process.exitCode = 1
} finally {
  cleanup()
}
