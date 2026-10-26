import { screen, waitFor } from '@testing-library/react'
import { http as mswHttp, HttpResponse } from 'msw'
import { landingPathFor } from '@/entities/session'
import { APP_NAME } from '@/shared/config'
import { makeMeDto, makeUser } from '@/test/fixtures/user'
import { api } from '@/test/msw/api'
import { renderRoute } from '@/test/render'

const LOGIN_OK = () =>
  HttpResponse.json({ accessToken: 'a', refreshToken: 'r', expiresAt: '2026-10-12T01:00:00Z' })
const handlersOk = () => [
  mswHttp.post(api('/auth/login'), LOGIN_OK),
  mswHttp.get(api('/me'), () => HttpResponse.json(makeMeDto())),
]
// Người dùng mà makeMeDto() mặc định ánh xạ thành.
const signedInUser = makeUser()

async function signInWith(
  user: ReturnType<typeof renderRoute>['user'],
  username: string,
  password: string,
) {
  await user.type(await screen.findByLabelText('Tên đăng nhập'), username)
  await user.type(screen.getByLabelText('Mật khẩu'), password)
  await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
}

test('trang đăng nhập hiện tên ứng dụng, tiêu đề và dòng hướng dẫn quên mật khẩu', async () => {
  renderRoute('/login', { user: null })

  expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  expect(screen.getByText(APP_NAME)).toBeInTheDocument()
  expect(
    screen.getByText('Quên mật khẩu: liên hệ quản trị viên để được cấp mật khẩu tạm.'),
  ).toBeInTheDocument()
})

test('đăng nhập thành công tới landingPathFor; nút đổi nhãn và khoá khi đang chờ', async () => {
  const { router, user } = renderRoute('/login', {
    user: null,
    handlers: [
      mswHttp.post(api('/auth/login'), async () => {
        await new Promise((resolve) => setTimeout(resolve, 60))
        return LOGIN_OK()
      }),
      mswHttp.get(api('/me'), () => HttpResponse.json(makeMeDto())),
    ],
  })

  await signInWith(user, 'an.nv', 'mat-khau-dai-123')

  expect(screen.getByRole('button', { name: 'Đang đăng nhập…' })).toBeDisabled()
  await waitFor(() => expect(router.state.location.pathname).toBe(landingPathFor(signedInUser)))
})

test('có ?next=%2Fsome%2Fpath thì tới /some/path', async () => {
  const { router, user } = renderRoute('/login?next=%2Fsome%2Fpath', {
    user: null,
    handlers: handlersOk(),
  })

  await signInWith(user, 'an.nv', 'mat-khau-dai-123')

  await waitFor(() => expect(router.state.location.pathname).toBe('/some/path'))
})

test.each(['//evil.com', 'https://evil.com'])(
  '?next=%s không được theo, về landingPathFor',
  async (next) => {
    const { router, user } = renderRoute(`/login?next=${encodeURIComponent(next)}`, {
      user: null,
      handlers: handlersOk(),
    })

    await signInWith(user, 'an.nv', 'mat-khau-dai-123')

    await waitFor(() => expect(router.state.location.pathname).toBe(landingPathFor(signedInUser)))
    expect(router.state.location.search).toBe('')
  },
)

test('sai thông tin đăng nhập hiện thông báo lỗi', async () => {
  const { user } = renderRoute('/login', {
    user: null,
    handlers: [
      mswHttp.post(api('/auth/login'), () =>
        HttpResponse.json(
          { status: 401, code: 'invalid_credentials', detail: 'Chi tiết.' },
          { status: 401 },
        ),
      ),
    ],
  })

  await signInWith(user, 'an.nv', 'sai-mat-khau-1')

  expect(await screen.findByText('Sai tên đăng nhập hoặc mật khẩu')).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Kiểm tra lại chữ hoa')
})

test('429 kèm Retry-After hiện số giây chờ', async () => {
  const { user } = renderRoute('/login', {
    user: null,
    handlers: [
      mswHttp.post(api('/auth/login'), () =>
        HttpResponse.json(
          { status: 429, code: 'too_many_requests', detail: 'x' },
          { status: 429, headers: { 'Retry-After': '30' } },
        ),
      ),
    ],
  })

  await signInWith(user, 'an.nv', 'mat-khau-dai-123')

  expect(await screen.findByText('Thử lại sau 30 giây.', { exact: false })).toBeInTheDocument()
})

test('mất mạng hiện thông báo "Không có kết nối mạng"', async () => {
  const { user } = renderRoute('/login', {
    user: null,
    handlers: [mswHttp.post(api('/auth/login'), () => HttpResponse.error())],
  })

  await signInWith(user, 'an.nv', 'mat-khau-dai-123')

  expect(await screen.findByText('Không có kết nối mạng')).toBeInTheDocument()
})

test('bỏ trống: báo lỗi từng ô và không gọi API', async () => {
  let calls = 0
  const { user } = renderRoute('/login', {
    user: null,
    handlers: [
      mswHttp.post(api('/auth/login'), () => {
        calls++
        return LOGIN_OK()
      }),
    ],
  })

  await user.click(await screen.findByRole('button', { name: 'Đăng nhập' }))

  expect(await screen.findByText('Cần nhập tên đăng nhập')).toBeInTheDocument()
  expect(screen.getByText('Cần nhập mật khẩu')).toBeInTheDocument()
  expect(screen.getByLabelText('Tên đăng nhập')).toHaveAttribute('aria-invalid', 'true')
  expect(calls).toBe(0)
})

test('sau khi đổi mật khẩu mà đăng nhập lại ngầm lỗi: hiện thông báo nhắc đăng nhập lại', async () => {
  const { router } = renderRoute('/login', { user: null })
  await router.navigate('/login', { state: { passwordChanged: true }, replace: true })

  expect(await screen.findByText('Đã đổi mật khẩu, hãy đăng nhập lại')).toBeInTheDocument()
})
