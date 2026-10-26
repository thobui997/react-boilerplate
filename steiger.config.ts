import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

export default defineConfig([
  ...fsd.configs.recommended,
  // <example-item>
  {
    // Tính năng mẫu cố ý tách entity khỏi trang để minh hoạ chuỗi dto → mapper → request → query → page.
    files: ['./src/entities/example-item/**'],
    rules: { 'fsd/insignificant-slice': 'off' },
  },
  // </example-item>
])
