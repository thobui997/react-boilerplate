import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dev-dist/**',
      'coverage/**',
      '.superpowers/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      'max-lines': ['error', { max: 300 }],
      // DTO chỉ được slice sở hữu import.
      'no-restricted-imports': [
        'error',
        {
          // Mẫu (đang tắt): chỉ cho import dayjs qua một module bao riêng.
          // paths: [{ name: 'dayjs', message: 'Chỉ import dayjs trong module bao ngày giờ.' }],
          patterns: [
            {
              group: ['**/api/dto', '**/api/**/dto', '**/api/*-dto'],
              message: 'DTO chỉ dùng trong api/ của chính slice.',
            },
            // Mẫu (đang tắt): { group: ['dayjs/*'], message: 'Chỉ import dayjs trong module bao ngày giờ.' },
          ],
        },
      ],
      // Mẫu (đang tắt): cấm dùng thời gian trực tiếp, buộc đi qua một module bao.
      // 'no-restricted-syntax': [
      //   'error',
      //   {
      //     selector: "NewExpression[callee.name='Date']",
      //     message: 'Không dùng new Date; dùng module bao ngày giờ.',
      //   },
      //   {
      //     selector:
      //       "CallExpression[callee.object.name='Date'][callee.property.name=/^(now|parse|UTC)$/]",
      //     message: 'Không dùng Date.now/parse/UTC; dùng module bao ngày giờ.',
      //   },
      // ],
    },
  },
)
