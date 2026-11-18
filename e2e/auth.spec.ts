import { expect, test } from '@playwright/test'
import { messages } from '../src/shared/i18n'
import { mockApi } from './support/mock-api'
import { signIn } from './support/sign-in'

test('chưa đăng nhập vào / bị chuyển tới /login', async ({ page }) => {
  await mockApi(page)

  await page.goto('/')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: messages.login.title })).toBeVisible()
})

test('chưa đăng nhập vào trang trong khung thì đăng nhập xong quay lại đúng trang đó', async ({
  page,
}) => {
  await mockApi(page)

  await page.goto('/settings')
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings$/)
  await signIn(page)

  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.getByRole('heading', { level: 1, name: messages.settings.title })).toBeVisible()
})

test('đăng nhập sai hiện lỗi và ở lại /login', async ({ page }) => {
  await mockApi(page)

  await signIn(page, 'mat-khau-sai')

  await expect(page.getByRole('alert')).toContainText(messages.login.errors.invalidCredentialsTitle)
  await expect(page).toHaveURL(/\/login$/)
})

test('bỏ trống form đăng nhập hiện lỗi từng ô và không gọi API', async ({ page }) => {
  const api = await mockApi(page)
  await page.goto('/login')

  await page.getByRole('button', { name: messages.login.submit }).click()

  await expect(page.getByText(messages.login.usernameRequired)).toBeVisible()
  await expect(page.getByText(messages.login.passwordRequired)).toBeVisible()
  expect(api.requests).not.toContain('POST /auth/login')
})

test('đăng xuất về /login, gọi logout và đóng phiên', async ({ page }) => {
  const api = await mockApi(page)
  await signIn(page)
  await expect(page).toHaveURL(/\/settings$/)

  await page
    .getByRole('banner')
    .getByRole('button', { name: messages.signOut.action, exact: true })
    .click()

  await expect(page).toHaveURL(/\/login$/)
  expect(api.requests).toContain('POST /auth/logout')

  await page.goto('/settings')
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings$/)
})

test('nút đổi giao diện đặt data-theme và giữ lại sau khi tải lại trang', async ({ page }) => {
  await mockApi(page)
  await signIn(page)
  // Trang cài đặt có thêm một nút đổi giao diện ở mục Giao diện; ở đây dùng nút của khung ứng dụng.
  const toggle = page.getByRole('banner').getByRole('button', { name: messages.theme.dark })

  await toggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
})
