import { expect, test } from '@playwright/test'
import { messages } from '../src/shared/i18n'
import { mockApi } from './support/mock-api'

test.beforeEach(async ({ page }) => {
  await mockApi(page)
})

test('chưa đăng nhập vào / bị chuyển tới /login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})

test('đăng nhập thành công tới danh sách mẫu rồi đăng xuất về /login', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(messages.login.username).fill('an.nv')
  await page.getByLabel(messages.login.password).fill('Matkhau-12345')
  await page.getByRole('button', { name: messages.login.submit }).click()

  // <example-item>
  await expect(page).toHaveURL(/\/example-items/)
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Mục A' })).toBeVisible()
  // </example-item>

  await page.getByRole('button', { name: messages.signOut.action, exact: true }).click()
  await expect(page).toHaveURL(/\/login/)
})
