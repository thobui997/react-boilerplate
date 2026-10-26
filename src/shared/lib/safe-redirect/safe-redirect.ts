const LAST_CONTROL_CHAR = 0x1f
const DELETE_CHAR = 0x7f

function hasControlOrBackslash(value: string): boolean {
  return Array.from(value).some((char) => {
    const code = char.charCodeAt(0)
    return char === '\\' || code <= LAST_CONTROL_CHAR || code === DELETE_CHAR
  })
}

// Chỉ nhận đường dẫn tương đối bắt đầu bằng đúng một '/'. Trình duyệt bỏ tab/xuống dòng khi phân tích URL
// nên '/\t/evil.com' sẽ thành '//evil.com' — vì vậy loại mọi ký tự điều khiển và '\'.
export function safeRedirect(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback
  return hasControlOrBackslash(next) ? fallback : next
}
