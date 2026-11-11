import { readFileSync } from 'node:fs'

const css = readFileSync('src/app/styles/index.css', 'utf8')

// Lấy thân khối `selector { ... }` (token là khai báo phẳng, không lồng ngoặc).
function block(selector: string): string {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) return ''
  return css.slice(start, css.indexOf('}', start))
}

describe('token shadcn trong index.css', () => {
  test('nhập tw-animate-css và shadcn/tailwind.css', () => {
    expect(css).toMatch(/@import\s+['"]tw-animate-css['"]/)
    expect(css).toMatch(/@import\s+['"]shadcn\/tailwind\.css['"]/)
  })

  test('giao diện tối đặt token dưới [data-theme=dark], không dùng .dark', () => {
    // Prettier chuẩn hoá dấu nháy của attribute selector thành [data-theme='dark'].
    const dark = block("[data-theme='dark']")
    for (const token of [
      '--background',
      '--foreground',
      '--primary',
      '--border',
      '--input',
      '--ring',
    ]) {
      expect(dark).toContain(`${token}:`)
    }
    expect(css).not.toMatch(/^\.dark\s*\{/m)
  })

  test('giữ custom-variant dark theo data-theme', () => {
    expect(css).toMatch(
      /@custom-variant dark \(&:where\(\[data-theme=dark\], \[data-theme=dark\] \*\)\);/,
    )
  })
})
