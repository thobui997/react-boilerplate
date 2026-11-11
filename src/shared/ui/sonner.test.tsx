import { render, screen } from '@testing-library/react'
import { Toaster } from './sonner'

describe('Toaster', () => {
  test('vùng thông báo có nhãn tiếng Việt cho trình đọc màn hình', () => {
    render(<Toaster />)

    expect(screen.getByRole('region', { name: /^Thông báo/ })).toBeInTheDocument()
  })
})
