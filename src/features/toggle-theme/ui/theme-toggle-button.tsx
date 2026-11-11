import { messages } from '@/shared/i18n'
import { setTheme, Theme, useTheme } from '@/shared/lib/theme'
import { Button } from '@/shared/ui/button'

// Nhãn cố định, trạng thái nằm ở aria-pressed: trình đọc màn hình đọc "Chế độ tối, đã bật/chưa bật".
// Dùng Button (không dùng Toggle) để giữ nguyên hợp đồng aria-pressed mà test đang kiểm.
export function ThemeToggleButton() {
  const isDark = useTheme() === Theme.Dark

  return (
    <Button
      type="button"
      variant={isDark ? 'secondary' : 'outline'}
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? Theme.Light : Theme.Dark)}
    >
      {messages.theme.dark}
    </Button>
  )
}
