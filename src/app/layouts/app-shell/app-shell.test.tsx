import { screen, within } from '@testing-library/react'
import { http as mswHttp, HttpResponse } from 'msw'
import { ROUTES } from '@/shared/config'
import { makeUser } from '@/test/fixtures/user'
import { api } from '@/test/msw/api'
import { renderRoute } from '@/test/render'

const mainNav = () => screen.getByRole('navigation', { name: 'Điều hướng chính' })
const linkNames = (nav: HTMLElement) =>
  within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent)

test('thanh điều hướng hiện các mục mà navItemsFor cho phép', async () => {
  renderRoute('/khong-co')

  await screen.findByRole('heading', { name: 'Không tìm thấy trang' })
  expect(linkNames(mainNav())).toEqual(['Cài đặt'])
  expect(within(mainNav()).getByRole('link', { name: 'Cài đặt' })).toHaveAttribute(
    'href',
    ROUTES.Settings,
  )
})

test('liên kết của route hiện tại có aria-current="page"', async () => {
  renderRoute(ROUTES.Settings)

  await screen.findByRole('heading', { level: 1, name: 'Cài đặt' })
  expect(within(mainNav()).getByRole('link', { name: 'Cài đặt' })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('đầu trang hiện tên người dùng và nút đổi giao diện', async () => {
  renderRoute('/khong-co', { user: makeUser({ displayName: 'Trần Thị Bình' }) })

  await screen.findByRole('heading', { name: 'Không tìm thấy trang' })
  const header = screen.getByRole('banner')
  expect(within(header).getByText('Trần Thị Bình')).toBeInTheDocument()
  expect(within(header).getByRole('button', { name: 'Chế độ tối' })).toBeInTheDocument()
})

test('bấm "Đăng xuất" gọi POST /auth/logout rồi tới /login', async () => {
  let loggedOut = false
  const { router, user } = renderRoute('/khong-co', {
    handlers: [
      mswHttp.post(api('/auth/logout'), () => {
        loggedOut = true
        return new HttpResponse(null, { status: 204 })
      }),
    ],
  })
  await screen.findByRole('heading', { name: 'Không tìm thấy trang' })

  await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Đăng xuất' }))

  expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  expect(loggedOut).toBe(true)
  expect(router.state.location.pathname).toBe(ROUTES.Login)
})
