import { expect, test } from '@playwright/test'
import { messages } from '../src/shared/i18n'
import { mockExampleItems } from './support/example-items-mock'
import { mockApi } from './support/mock-api'
import { signIn } from './support/sign-in'

const text = messages.exampleItems

test('người dùng không có quyền item:read vào /example-items bị chuyển về /settings', async ({
  page,
}) => {
  await mockApi(page, { permissions: [] })
  await mockExampleItems(page)
  await signIn(page)
  await expect(page).toHaveURL(/\/settings$/)

  await page.goto('/example-items')

  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.getByRole('link', { name: text.title })).toHaveCount(0)
})

test.describe('có quyền đọc và ghi', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page, { permissions: ['item:read', 'item:write'] })
    await mockExampleItems(page)
    await signIn(page)
    await expect(page).toHaveURL(/\/example-items$/)
  })

  test('đăng nhập về danh sách mẫu và hiện dữ liệu', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: text.title })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Mục A' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Mục B' })).toBeVisible()
    await expect(
      page.getByRole('navigation', { name: messages.shell.mainNav }).getByRole('link', {
        name: text.title,
      }),
    ).toHaveAttribute('aria-current', 'page')
  })

  test('thêm mục mới hiện ngay trong danh sách kèm thông báo', async ({ page }) => {
    await page.getByRole('button', { name: text.add }).click()
    await page.getByLabel(text.form.name, { exact: true }).fill('Mục C')
    await page.getByLabel(text.form.description, { exact: true }).fill('Mô tả C')
    await page.getByRole('button', { name: text.form.save }).click()

    await expect(page.getByRole('cell', { name: 'Mục C' })).toBeVisible()
    await expect(page.getByText(text.created)).toBeVisible()
  })

  test('xóa mục phải qua hộp thoại xác nhận; huỷ thì giữ nguyên', async ({ page }) => {
    const rowA = page.getByRole('row', { name: /Mục A/ })

    await rowA.getByRole('button', { name: text.remove }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText(text.confirmRemove('Mục A'))
    await dialog.getByRole('button', { name: text.form.cancel }).click()
    await expect(page.getByRole('cell', { name: 'Mục A' })).toBeVisible()

    await rowA.getByRole('button', { name: text.remove }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: text.remove }).click()
    await expect(page.getByRole('cell', { name: 'Mục A' })).toHaveCount(0)
    await expect(page.getByRole('cell', { name: 'Mục B' })).toBeVisible()
  })
})
