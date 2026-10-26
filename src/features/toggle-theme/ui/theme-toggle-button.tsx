import { messages } from '@/shared/i18n'
import { setTheme, Theme, useTheme } from '@/shared/lib/theme'

// Nhãn cố định, trạng thái nằm ở aria-pressed: trình đọc màn hình đọc "Chế độ tối, đã bật/chưa bật".
export function ThemeToggleButton() {
  const isDark = useTheme() === Theme.Dark

  return (
    <button
      type="button"
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? Theme.Light : Theme.Dark)}
    >
      {messages.theme.dark}
    </button>
  )
}
