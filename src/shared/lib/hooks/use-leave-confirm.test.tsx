import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Link } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { FORCED_NAVIGATION_STATE, useLeaveConfirm } from './use-leave-confirm'

function Editor({ dirty }: { dirty: boolean }) {
  const leave = useLeaveConfirm(dirty)
  return (
    <div>
      <p>Trang soạn</p>
      <Link to="/other">Đi nơi khác</Link>
      {leave.blocked && (
        <div role="dialog">
          <button onClick={leave.cancel}>Ở lại</button>
          <button onClick={leave.confirm}>Bỏ thay đổi</button>
        </div>
      )}
    </div>
  )
}

function renderEditor(dirty: boolean) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <Editor dirty={dirty} /> },
      { path: '/other', element: <p>Trang khác</p> },
    ],
    { initialEntries: ['/'] },
  )
  render(<RouterProvider router={router} />)
  return Object.assign(userEvent.setup(), { router })
}

test('không dirty thì điều hướng bình thường', async () => {
  const user = renderEditor(false)

  await user.click(screen.getByRole('link', { name: 'Đi nơi khác' }))

  expect(await screen.findByText('Trang khác')).toBeInTheDocument()
})

test('dirty: chặn điều hướng; "Ở lại" giữ trang, "Bỏ thay đổi" đi tiếp', async () => {
  const user = renderEditor(true)

  await user.click(screen.getByRole('link', { name: 'Đi nơi khác' }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.queryByText('Trang khác')).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Ở lại' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByText('Trang soạn')).toBeInTheDocument()

  await user.click(screen.getByRole('link', { name: 'Đi nơi khác' }))
  await user.click(screen.getByRole('button', { name: 'Bỏ thay đổi' }))
  expect(await screen.findByText('Trang khác')).toBeInTheDocument()
})

test('dirty đăng ký beforeunload để chặn đóng tab', () => {
  renderEditor(true)

  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)

  expect(event.defaultPrevented).toBe(true)
})

test('điều hướng cưỡng bức của app (hết phiên, bắt đổi mật khẩu) không bị chặn dù còn thay đổi chưa lưu', async () => {
  const user = renderEditor(true)

  await act(() => user.router.navigate('/other', { state: FORCED_NAVIGATION_STATE }))

  expect(await screen.findByText('Trang khác')).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
