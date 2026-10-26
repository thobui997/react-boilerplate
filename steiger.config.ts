import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Tạm, gỡ ở Task 12: sign-out, toggle-theme, change-password chưa có trang/shell nào dùng tới nên
    // `fsd/insignificant-slice` báo chúng. Hạ xuống cảnh báo (không tắt: tắt sẽ loại file khỏi cây luật và
    // làm entities/session mất tham chiếu).
    files: ['./src/features/**'],
    rules: { 'fsd/insignificant-slice': 'warn' },
  },
])
