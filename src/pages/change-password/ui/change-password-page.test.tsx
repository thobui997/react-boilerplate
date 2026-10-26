import { screen, waitFor } from '@testing-library/react'
import { http as mswHttp, HttpResponse } from 'msw'
import { landingPathFor } from '@/entities/session'
import { makeMeDto, makeUser } from '@/test/fixtures/user'
import { api } from '@/test/msw/api'
import { renderRoute } from '@/test/render'

const FORCED_USER = makeUser({ mustChangePassword: true })
const NEW_PASSWORD = 'matkhau-moi-123'

async function fillAndSubmit(user: ReturnType<typeof renderRoute>['user'], current: string) {
  await user.type(await screen.findByLabelText('Mật khẩu tạm'), current)
  await user.type(screen.getByLabelText('Mật khẩu mới'), NEW_PASSWORD)
  await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), NEW_PASSWORD)
  await user.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }))
}

test('hiện tiêu đề và lời nhắc theo tên người dùng', async () => {
  renderRoute('/change-password', { user: FORCED_USER })

  expect(await screen.findByRole('heading', { level: 1, name: 'Đổi mật khẩu tạm' })).toBeVisible()
  expect(
    screen.getByText('Nguyễn Văn An cần đặt mật khẩu riêng trước khi dùng ứng dụng.'),
  ).toBeInTheDocument()
})

test('đổi thành công rồi đăng nhập lại ngầm: tới landingPathFor của người dùng', async () => {
  let changed = false
  const { router, user } = renderRoute('/change-password', {
    user: FORCED_USER,
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
      mswHttp.get(api('/me'), () => HttpResponse.json(makeMeDto({ mustChangePassword: !changed }))),
    ],
  })

  await fillAndSubmit(user, 'mat-khau-tam-1')

  const landing = landingPathFor({ ...FORCED_USER, mustChangePassword: false })
  await waitFor(() => expect(router.state.location.pathname).toBe(landing))
  expect(changed).toBe(true)
})

test('sai mật khẩu tạm (422 theo field currentPassword): lỗi server hiện dưới đúng ô, không đổi trang', async () => {
  const { router, user } = renderRoute('/change-password', {
    user: FORCED_USER,
    handlers: [
      mswHttp.post(api('/auth/change-password'), () =>
        HttpResponse.json(
          {
            status: 422,
            code: 'validation_failed',
            detail: 'x',
            errors: { currentPassword: [{ code: 'invalid', message: 'Mật khẩu tạm không đúng.' }] },
          },
          { status: 422 },
        ),
      ),
    ],
  })

  await fillAndSubmit(user, 'sai-mat-khau-1')

  const message = await screen.findByText('Mật khẩu tạm không đúng.')
  const field = screen.getByLabelText('Mật khẩu tạm')
  expect(field).toHaveAttribute('aria-invalid', 'true')
  expect(field.getAttribute('aria-describedby')).toBe(message.id)
  expect(screen.getByLabelText('Mật khẩu mới')).not.toHaveAttribute('aria-invalid')
  expect(router.state.location.pathname).toBe('/change-password')
})

test('đăng nhập lại ngầm lỗi: về /login kèm thông báo nhắc đăng nhập lại', async () => {
  const { router, user } = renderRoute('/change-password', {
    user: FORCED_USER,
    handlers: [
      mswHttp.post(api('/auth/change-password'), () => new HttpResponse(null, { status: 204 })),
      mswHttp.post(api('/auth/login'), () =>
        HttpResponse.json({ status: 500, code: 'internal_error', detail: 'x' }, { status: 500 }),
      ),
    ],
  })

  await fillAndSubmit(user, 'mat-khau-tam-1')

  await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  expect(await screen.findByText('Đã đổi mật khẩu, hãy đăng nhập lại')).toBeInTheDocument()
})

test('nút "Đăng xuất" gọi POST /auth/logout rồi tới /login', async () => {
  let loggedOut = false
  const { router, user } = renderRoute('/change-password', {
    user: FORCED_USER,
    handlers: [
      mswHttp.post(api('/auth/logout'), () => {
        loggedOut = true
        return new HttpResponse(null, { status: 204 })
      }),
    ],
  })

  await user.click(await screen.findByRole('button', { name: 'Đăng xuất' }))

  await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  expect(loggedOut).toBe(true)
})

test('người dùng không bị buộc đổi mật khẩu bị chuyển khỏi trang', async () => {
  const user = makeUser({ permissions: [] })
  const { router } = renderRoute('/change-password', { user })

  await waitFor(() => expect(router.state.location.pathname).toBe(landingPathFor(user)))
})
