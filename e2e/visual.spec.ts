import { expect, test } from '@playwright/test'
import { messages } from '../src/shared/i18n'
import { mockApi } from './support/mock-api'
import { signIn } from './support/sign-in'

// Visual check: bắt lỗi bố cục/giao diện mà test chức năng không thấy. theme-init.js chọn data-theme theo
// prefers-color-scheme khi chưa có lựa chọn đã lưu nên emulateMedia đủ để chụp cả hai giao diện.
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`giao diện ${colorScheme}`, () => {
    test.use({ colorScheme })

    test('trang đăng nhập', async ({ page }) => {
      await mockApi(page)
      await page.goto('/login')
      await expect(page.getByRole('heading', { name: messages.login.title })).toBeVisible()

      await expect(page).toHaveScreenshot(`login-${colorScheme}.png`)
    })

    test('trang cài đặt', async ({ page }) => {
      await mockApi(page)
      await signIn(page)
      await expect(
        page.getByRole('heading', { level: 1, name: messages.settings.title }),
      ).toBeVisible()

      await expect(page).toHaveScreenshot(`settings-${colorScheme}.png`)
    })
  })
}
