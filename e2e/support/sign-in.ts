import type { Page } from '@playwright/test'
import { messages } from '../../src/shared/i18n'
import { CREDENTIALS } from './mock-api'

// Đăng nhập qua giao diện thật (không đặt token tay) để mọi test cùng chạy chuỗi form → API → guard.
export async function signIn(page: Page, password = CREDENTIALS.password): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(messages.login.username).fill(CREDENTIALS.username)
  await page.getByLabel(messages.login.password).fill(password)
  await page.getByRole('button', { name: messages.login.submit }).click()
}
