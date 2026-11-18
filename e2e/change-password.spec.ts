import { expect, test, type Page } from '@playwright/test'
import { messages } from '../src/shared/i18n'
import { CREDENTIALS, mockApi } from './support/mock-api'
import { signIn } from './support/sign-in'

const labels = messages.changePassword.labels

async function fillForcedForm(page: Page, values: { current: string; next: string }) {
  await page.getByLabel(labels.temporary, { exact: true }).fill(values.current)
  await page.getByLabel(labels.next, { exact: true }).fill(values.next)
  await page.getByLabel(labels.confirm, { exact: true }).fill(values.next)
}

test('mật khẩu tạm: mọi trang bị chuyển về /change-password cho tới khi đổi xong', async ({
  page,
}) => {
  await mockApi(page, { mustChangePassword: true })

  await signIn(page)
  await expect(page).toHaveURL(/\/change-password$/)
  await expect(
    page.getByRole('heading', { name: messages.changePassword.page.title }),
  ).toBeVisible()

  await page.goto('/settings')
  await expect(page).toHaveURL(/\/change-password$/)
})

test('đổi mật khẩu tạm thành công rồi vào ứng dụng bằng phiên mới', async ({ page }) => {
  const api = await mockApi(page, { mustChangePassword: true })
  await signIn(page)

  await fillForcedForm(page, { current: CREDENTIALS.password, next: 'Matkhau-moi-67890' })
  await page.getByRole('button', { name: messages.changePassword.actions.saveForced }).click()

  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.getByRole('heading', { level: 1, name: messages.settings.title })).toBeVisible()
  // Đổi xong app đăng nhập lại ngầm bằng mật khẩu mới.
  expect(api.requests.filter((r) => r === 'POST /auth/login')).toHaveLength(2)
  expect(api.requests).toContain('POST /auth/change-password')
})

test('nút lưu bị khóa cho tới khi mật khẩu mới đạt mọi yêu cầu', async ({ page }) => {
  await mockApi(page, { mustChangePassword: true })
  await signIn(page)
  const save = page.getByRole('button', { name: messages.changePassword.actions.saveForced })

  await page.getByLabel(labels.temporary, { exact: true }).fill(CREDENTIALS.password)
  await page.getByLabel(labels.next, { exact: true }).fill('ngan')
  await expect(save).toBeDisabled()

  await page.getByLabel(labels.next, { exact: true }).fill('Matkhau-moi-67890')
  await page.getByLabel(labels.confirm, { exact: true }).fill('Matkhau-khac-00000')
  await expect(save).toBeDisabled()

  await page.getByLabel(labels.confirm, { exact: true }).fill('Matkhau-moi-67890')
  await expect(save).toBeEnabled()
})

test('mật khẩu tạm nhập sai hiện lỗi ở ô mật khẩu và ở lại trang', async ({ page }) => {
  await mockApi(page, { mustChangePassword: true })
  await signIn(page)

  await fillForcedForm(page, { current: 'mat-khau-tam-sai', next: 'Matkhau-moi-67890' })
  await page.getByRole('button', { name: messages.changePassword.actions.saveForced }).click()

  await expect(page.getByRole('alert')).toContainText('Mật khẩu hiện tại không đúng.')
  await expect(page).toHaveURL(/\/change-password$/)
})
