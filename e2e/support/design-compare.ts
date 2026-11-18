import type { Page } from '@playwright/test'

// Dùng cho skill verify-design (so bản làm với design). Đo cùng một danh sách phần tử, tìm theo vai trò truy cập và tên
// (design Claude Design dùng <button>, <label>, <h1>... thật nên khớp được mà không cần chung selector), rồi báo chênh lệch.
export interface Target {
  role: Parameters<Page['getByRole']>[0]
  name: string | RegExp
}

export interface Measure {
  key: string
  box: { x: number; y: number; width: number; height: number } | null
  style: Record<string, string>
}

const STYLE_PROPS = [
  'color',
  'background-color',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'border-radius',
  'border-top-width',
  'border-top-color',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'gap',
  'box-shadow',
] as const

const COLOR_PROPS = ['color', 'background-color', 'border-top-color'] as const

export async function measure(page: Page, targets: Target[]): Promise<Measure[]> {
  const out: Measure[] = []
  for (const target of targets) {
    const locator = page.getByRole(target.role, { name: target.name }).first()
    const key = `${target.role} "${String(target.name)}"`
    if ((await locator.count()) === 0) {
      out.push({ key, box: null, style: {} })
      continue
    }
    const box = await locator.boundingBox()
    // Toạ độ theo tài liệu (không theo viewport) để so được dù trang đã cuộn.
    const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))
    const style = await locator.evaluate(
      (el, { props, colorProps }) => {
        const computed = getComputedStyle(el)
        // Màu về cùng dạng sRGB qua canvas: design viết hex/rgb, app viết oklch; so chuỗi nguyên văn sẽ báo lệch giả.
        const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
        const toRgb = (value: string) => {
          if (!ctx) return value
          ctx.clearRect(0, 0, 1, 1)
          ctx.fillStyle = '#000'
          ctx.fillStyle = value
          ctx.fillRect(0, 0, 1, 1)
          const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
          return a === 0
            ? 'transparent'
            : `rgb(${r}, ${g}, ${b}${a < 255 ? `, ${(a / 255).toFixed(2)}` : ''})`
        }
        return Object.fromEntries(
          props.map((p) => {
            const value = computed.getPropertyValue(p)
            return [p, colorProps.includes(p) ? toRgb(value) : value]
          }),
        )
      },
      { props: [...STYLE_PROPS] as string[], colorProps: [...COLOR_PROPS] as string[] },
    )
    out.push({
      key,
      box: box && {
        x: box.x + scroll.x,
        y: box.y + scroll.y,
        width: box.width,
        height: box.height,
      },
      style,
    })
  }
  return out
}

// `tolerance` là số px cho phép lệch ở kích thước và vị trí (anti-aliasing, làm tròn). Giá trị style so nguyên văn (màu đã đổi về rgb):
// màu, cỡ chữ, bo góc... lệch là lệch. Chuỗi font-family được so lỏng: chỉ tên đầu tiên.
export function diffMeasures(design: Measure[], actual: Measure[], tolerance = 1): string[] {
  const issues: string[] = []
  design.forEach((expected, index) => {
    const got = actual[index]
    if (!expected.box)
      return issues.push(`${expected.key}: không có trong design (kiểm lại tên/vai trò)`)
    if (!got?.box) return issues.push(`${expected.key}: THIẾU ở bản làm`)
    for (const dim of ['x', 'y', 'width', 'height'] as const) {
      const delta = got.box[dim] - expected.box[dim]
      if (Math.abs(delta) > tolerance) {
        issues.push(
          `${expected.key}: ${dim} design ${expected.box[dim].toFixed(1)} · làm ${got.box[dim].toFixed(1)}`,
        )
      }
    }
    for (const prop of Object.keys(expected.style)) {
      const a = normalise(prop, expected.style[prop])
      const b = normalise(prop, got.style[prop])
      if (a !== b) issues.push(`${expected.key}: ${prop} design ${a} · làm ${b}`)
    }
  })
  return issues
}

function normalise(prop: string, value: string | undefined): string {
  const text = (value ?? '').trim()
  return prop === 'font-family' ? text.split(',')[0].replace(/["']/g, '').trim() : text
}
