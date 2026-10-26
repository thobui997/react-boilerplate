import { screen, waitFor, within } from '@testing-library/react'
import { http as mswHttp, HttpResponse } from 'msw'
import { ROUTES } from '@/shared/config'
import { makeUser } from '@/test/fixtures/user'
import { api } from '@/test/msw/api'
import { renderRoute } from '@/test/render'

async function openSettings(options: Parameters<typeof renderRoute>[1] = {}) {
  const view = renderRoute(ROUTES.Settings, options)
  await screen.findByRole('heading', { level: 1, name: 'Cài đặt' })
  return { ...view, page: within(screen.getByRole('main')) }
}

test('người dùng không có quyền nào vẫn vào được /settings trong khung ứng dụng, không bị chuyển hướng', async () => {
  const { router } = await openSettings({ user: makeUser({ permissions: [] }) })

  expect(router.state.location.pathname).toBe(ROUTES.Settings)
  expect(router.state.navigation.state).toBe('idle')
  expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument()
})

test('hồ sơ hiện tên hiển thị, tên đăng nhập và vai trò', async () => {
  const { page } = await openSettings()

  expect(page.getByText('Nguyễn Văn An')).toBeInTheDocument()
  expect(page.getByText('an.nv')).toBeInTheDocument()
  expect(page.getByText('Vai trò: member')).toBeInTheDocument()
})

test('nút "Chế độ tối" trong phần giao diện đổi theme và lưu localStorage', async () => {
  localStorage.setItem('app:theme', 'light')
  const { page, user } = await openSettings({
    setup: () => localStorage.setItem('app:theme', 'light'),
  })

  await user.click(page.getByRole('button', { name: 'Chế độ tối' }))

  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem('app:theme')).toBe('dark')
  await user.click(page.getByRole('button', { name: 'Chế độ tối' }))
  expect(document.documentElement.dataset.theme).toBe('light')
})

describe('đổi mật khẩu', () => {
  test('"Đổi mật khẩu" mở form ba ô; "Huỷ" đóng và xoá giá trị đã nhập', async () => {
    const { page, user } = await openSettings()
    expect(page.queryByLabelText('Mật khẩu hiện tại')).not.toBeInTheDocument()

    await user.click(page.getByRole('button', { name: 'Đổi mật khẩu' }))
    await user.type(page.getByLabelText('Mật khẩu hiện tại'), 'mat-khau-cu-1')
    expect(page.getByLabelText('Mật khẩu mới')).toBeInTheDocument()
    expect(page.getByLabelText('Nhập lại mật khẩu mới')).toBeInTheDocument()

    await user.click(page.getByRole('button', { name: 'Huỷ' }))
    expect(page.queryByLabelText('Mật khẩu hiện tại')).not.toBeInTheDocument()

    await user.click(page.getByRole('button', { name: 'Đổi mật khẩu' }))
    expect(page.getByLabelText('Mật khẩu hiện tại')).toHaveValue('')
  })

  test('thành công: thông báo "Đã đổi mật khẩu", vẫn ở /settings và đóng form', async () => {
    let changed = false
    const { router, page, user } = await openSettings({
      handlers: [
        mswHttp.post(api('/auth/change-password'), () => {
          changed = true
          return new HttpResponse(null, { status: 204 })
        }),
        mswHttp.post(api('/auth/login'), () =>
          HttpResponse.json({
            accessToken: 'a2',
            refreshToken: 'r2',
            expiresAt: '2026-10-12T01:00:00Z',
            mustChangePassword: false,
          }),
        ),
      ],
    })

    await user.click(page.getByRole('button', { name: 'Đổi mật khẩu' }))
    await user.type(page.getByLabelText('Mật khẩu hiện tại'), 'mat-khau-cu-1')
    await user.type(page.getByLabelText('Mật khẩu mới'), 'matkhau-moi-123')
    await user.type(page.getByLabelText('Nhập lại mật khẩu mới'), 'matkhau-moi-123')
    await user.click(page.getByRole('button', { name: 'Lưu mật khẩu' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Đã đổi mật khẩu')
    expect(changed).toBe(true)
    expect(router.state.location.pathname).toBe(ROUTES.Settings)
    await waitFor(() => expect(page.queryByLabelText('Mật khẩu hiện tại')).not.toBeInTheDocument())
  })
})

test('"Đăng xuất tài khoản" gọi POST /auth/logout rồi tới /login', async () => {
  let loggedOut = false
  const { router, page, user } = await openSettings({
    handlers: [
      mswHttp.post(api('/auth/logout'), () => {
        loggedOut = true
        return new HttpResponse(null, { status: 204 })
      }),
    ],
  })

  await user.click(page.getByRole('button', { name: 'Đăng xuất tài khoản' }))

  await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.Login))
  expect(loggedOut).toBe(true)
})
