import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setTheme, Theme } from '@/shared/lib/theme'
import { ThemeToggleButton } from './theme-toggle-button'

beforeEach(() => {
  setTheme(Theme.Light)
})

test('đổi giao diện sáng ↔ tối và phản ánh bằng aria-pressed', async () => {
  render(<ThemeToggleButton />)
  const button = screen.getByRole('button', { name: 'Chế độ tối' })
  expect(button).toHaveAttribute('aria-pressed', 'false')

  await userEvent.click(button)

  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem('app:theme')).toBe('dark')
  expect(screen.getByRole('button', { name: 'Chế độ tối' })).toHaveAttribute('aria-pressed', 'true')

  await userEvent.click(screen.getByRole('button', { name: 'Chế độ tối' }))

  expect(document.documentElement.dataset.theme).toBe('light')
  expect(screen.getByRole('button', { name: 'Chế độ tối' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})

test('đang ở giao diện tối thì nút ở trạng thái nhấn', () => {
  setTheme(Theme.Dark)

  render(<ThemeToggleButton />)

  expect(screen.getByRole('button', { name: 'Chế độ tối' })).toHaveAttribute('aria-pressed', 'true')
})
