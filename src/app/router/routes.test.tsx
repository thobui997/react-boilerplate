import { screen, waitFor } from '@testing-library/react'
import { http as mswHttp, HttpResponse } from 'msw'
import { landingPathFor } from '@/entities/session'
import { ROUTES } from '@/shared/config'
import { makeMeDto, makeUser } from '@/test/fixtures/user'
import { api } from '@/test/msw/api'
import { renderRoute } from '@/test/render'

type RouterLike = { state: { location: { pathname: string; search: string } } }

async function expectPath(router: RouterLike, expected: string) {
  await waitFor(() =>
    expect(`${router.state.location.pathname}${router.state.location.search}`).toBe(expected),
  )
}

describe('chưa đăng nhập', () => {
  test('/example-nonexistent chuyển tới /login?next=%2Fexample-nonexistent', async () => {
    const { router } = renderRoute('/example-nonexistent', { user: null })

    await expectPath(router, '/login?next=%2Fexample-nonexistent')
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  test('/ chuyển tới /login không kèm next', async () => {
    const { router } = renderRoute('/', { user: null })

    await expectPath(router, ROUTES.Login)
  })
})

describe('đã đăng nhập', () => {
  test('/ chuyển tới landingPathFor', async () => {
    const user = makeUser()
    const { router } = renderRoute('/', { user })

    await expectPath(router, landingPathFor(user))
  })

  test('mustChangePassword: vào / bị chuyển tới /change-password', async () => {
    const { router } = renderRoute('/', { user: makeUser({ mustChangePassword: true }) })

    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.ChangePassword))
  })

  test('không vòng chuyển hướng: người dùng không quyền ở yên tại landingPathFor', async () => {
    const user = makeUser({ permissions: [] })
    const { router } = renderRoute(landingPathFor(user), { user })

    await screen.findByRole('navigation')
    await expectPath(router, landingPathFor(user))
    expect(router.state.navigation.state).toBe('idle')
  })
})

describe('?next= sau đăng nhập', () => {
  test('đã có phiên, /login?next=%2Fsome%2Fpath chuyển tới /some/path', async () => {
    const { router } = renderRoute('/login?next=%2Fsome%2Fpath')

    await expectPath(router, '/some/path')
  })

  test.each(['//evil.com', 'https://evil.com', '/\\evil.com'])(
    '?next=%s bị bỏ, về landingPathFor và không rời origin',
    async (next) => {
      const user = makeUser()
      const { router } = renderRoute(`/login?next=${encodeURIComponent(next)}`, { user })

      await expectPath(router, landingPathFor(user))
      expect(router.state.location.pathname).not.toMatch(/evil/)
    },
  )
})

describe('trang không tìm thấy', () => {
  test('đường dẫn lạ hiện trang không tìm thấy trong khung ứng dụng', async () => {
    renderRoute('/khong-co')

    expect(await screen.findByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  test('nút "Về trang chủ" đưa về landingPathFor', async () => {
    const user = makeUser()
    const { router, user: actor } = renderRoute('/khong-co', { user })

    await actor.click(await screen.findByRole('button', { name: 'Về trang chủ' }))

    await expectPath(router, landingPathFor(user))
  })
})

describe('khởi động khi lấy người dùng lỗi', () => {
  test.each([
    [
      'máy chủ 500',
      () =>
        HttpResponse.json({ status: 500, code: 'internal_error', detail: 'x' }, { status: 500 }),
    ],
    ['mất mạng', () => HttpResponse.error()],
  ])('%s: hiện RouteErrorBoundary có nút "Thử lại", không bị đẩy về login', async (_l, respond) => {
    const { router } = renderRoute('/khong-co', { handlers: [mswHttp.get(api('/me'), respond)] })

    expect(await screen.findByRole('heading', { name: 'Có lỗi xảy ra' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
    expect(screen.queryByText(/Unexpected Application Error/)).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/khong-co')
  })

  test('"Thử lại" tải lại phiên và vào được trang', async () => {
    let calls = 0
    const { user } = renderRoute('/khong-co', {
      handlers: [
        mswHttp.get(api('/me'), () => {
          calls++
          return calls === 1
            ? HttpResponse.json({ status: 503, code: 'unavailable', detail: 'x' }, { status: 503 })
            : HttpResponse.json(makeMeDto())
        }),
      ],
    })

    await user.click(await screen.findByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument()
  })

  test('trong lúc chờ người dùng hiện màn đang tải thay vì trang trắng', async () => {
    renderRoute('/khong-co', {
      handlers: [
        mswHttp.get(api('/me'), async () => {
          await new Promise((resolve) => setTimeout(resolve, 80))
          return HttpResponse.json(makeMeDto())
        }),
      ],
    })

    expect(screen.getByRole('status', { name: 'Đang tải ứng dụng' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument()
  })
})
