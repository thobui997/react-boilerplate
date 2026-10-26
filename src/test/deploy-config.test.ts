import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(path, 'utf8')

describe('deploy/nginx.conf', () => {
  const raw = read('deploy/nginx.conf')
  // Bỏ dòng comment để lời giải thích (vd. nhắc 'unsafe-inline') không làm test pass nhầm.
  const nginx = raw
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n')
  const locationBlocks = [...nginx.matchAll(/location [^{]+\{([^}]*)\}/g)].map((m) => m[1])
  const withHeaders = locationBlocks.filter((body) => body.includes('add_header'))
  const serverLevel = nginx.replace(/location [^{]+\{[^}]*\}/g, '')
  const cspValues = (text: string) =>
    [...text.matchAll(/add_header\s+Content-Security-Policy\s+"([^"]*)"/g)].map((m) => m[1])

  const CANONICAL_CSP = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  test('mọi bản CSP giống hệt nhau và đúng tám chỉ thị yêu cầu', () => {
    const values = cspValues(nginx)
    expect(values.length).toBeGreaterThan(0)
    for (const value of values) expect(value).toBe(CANONICAL_CSP)
  })

  test('CSP không có unsafe-inline / unsafe-eval (comment không được tính)', () => {
    const values = cspValues(nginx)
    expect(values.length).toBeGreaterThan(0)
    for (const value of values) expect(value).not.toMatch(/'unsafe-(inline|eval)'/)
  })

  test('mỗi location có add_header và cấp server (nếu có) đều có đúng một CSP', () => {
    expect(withHeaders.length).toBeGreaterThan(0)
    for (const body of withHeaders) expect(cspValues(body)).toHaveLength(1)
    const serverCount = cspValues(serverLevel).length
    expect(serverCount).toBeLessThanOrEqual(1)
    expect(cspValues(nginx)).toHaveLength(withHeaders.length + serverCount)
  })

  test('mọi location có add_header đều lặp lại X-Content-Type-Options', () => {
    for (const body of withHeaders) {
      expect(body).toMatch(/add_header\s+X-Content-Type-Options\s+nosniff/)
    }
  })

  test('ghi chú cách nới style-src khi UI lib chèn style inline', () => {
    expect(raw).toMatch(/#.*'unsafe-inline'/)
  })

  test('có /healthz và /api/ trả 404', () => {
    expect(nginx).toMatch(/location = \/healthz\s*\{/)
    expect(nginx).toMatch(/location \/api\/\s*\{\s*return 404;/)
  })

  test('không còn cấu hình service worker / manifest', () => {
    expect(nginx).not.toMatch(/sw\.js|webmanifest/)
  })
})

describe('Dockerfile', () => {
  const dockerfile = read('Dockerfile')

  test('không chứa biến của dự án gốc', () => {
    expect(dockerfile).not.toContain('VITE_DEV_API_TARGET')
    expect(dockerfile).not.toContain('VITE_UNIT_NAME')
    expect(dockerfile).not.toContain('verify:pwa')
  })

  test('nhận build-arg VITE_API_BASE và phục vụ ở cổng 8080', () => {
    expect(dockerfile).toContain('ARG VITE_API_BASE')
    expect(dockerfile).toContain('EXPOSE 8080')
  })
})

describe('.github/workflows', () => {
  test('ci.yml không khóa nhánh develop và có đủ các bước kiểm tra', () => {
    const ci = read('.github/workflows/ci.yml')
    expect(ci).not.toContain("branches: ['develop']")
    for (const step of [
      'npm run typecheck',
      'npm run lint',
      'npm run format:check',
      'npm run test',
      'npm run build',
    ]) {
      expect(ci).toContain(step)
    }
    expect(ci).not.toMatch(/test:tz|verify-pwa/)
  })

  test('publish-image.yml chỉ dùng GITHUB_TOKEN, chạy khi push tag v*', () => {
    const publish = read('.github/workflows/publish-image.yml')
    expect(publish).toContain("'v*'")
    expect(publish).toContain('ghcr.io/${{ github.repository }}')
    expect(publish).toContain('packages: write')
    expect(publish).not.toContain('self-hosted')
    const secrets = [...publish.matchAll(/secrets\.(\w+)/g)].map((m) => m[1])
    expect(secrets.length).toBeGreaterThan(0)
    expect(new Set(secrets)).toEqual(new Set(['GITHUB_TOKEN']))
  })
})

describe('index.html', () => {
  test('không có <script> inline (mọi <script> đều có src)', () => {
    const html = read('index.html')
    const tags = [...html.matchAll(/<script\b[^>]*>/g)].map((m) => m[0])
    expect(tags.length).toBeGreaterThan(0)
    for (const tag of tags) expect(tag).toMatch(/\ssrc=/)
  })
})
