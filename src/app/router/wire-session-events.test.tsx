import { screen, waitFor } from '@testing-library/react'
import { http as mswHttp, HttpResponse } from 'msw'
import { sessionQueries } from '@/entities/session'
import { http } from '@/shared/api'
import { AUTH_CHANNEL, ROUTES } from '@/shared/config'
import { FORCED_NAVIGATION_STATE } from '@/shared/lib/hooks'
import { api } from '@/test/msw/api'
import { renderRoute } from '@/test/render'

const UNAUTHORIZED = () =>
  HttpResponse.json({ status: 401, code: 'unauthorized', detail: 'x' }, { status: 401 })
const REFRESH_REJECTED = () =>
  HttpResponse.json(
    { status: 401, code: 'refresh_reuse_detected', detail: 'Phiên không hợp lệ.' },
    { status: 401 },
  )

test('hết phiên: xoá cache, về /login?next=… kèm thông báo', async () => {
  const { router, queryClient } = renderRoute('/khong-co?x=1', {
    handlers: [
      mswHttp.get(api('/data'), UNAUTHORIZED),
      mswHttp.post(api('/auth/refresh'), REFRESH_REJECTED),
    ],
  })
  await screen.findByRole('heading', { name: 'Không tìm thấy trang' })

  await http.get('/data').catch(() => undefined)

  await waitFor(() =>
    expect(router.state.location.pathname + router.state.location.search).toBe(
      '/login?next=%2Fkhong-co%3Fx%3D1',
    ),
  )
  expect(router.state.location.state).toEqual(FORCED_NAVIGATION_STATE)
  expect(queryClient.getQueryData(sessionQueries.current().queryKey)).toBeUndefined()
  expect(await screen.findByText('Phiên đã hết hạn')).toBeInTheDocument()
})

test('đăng xuất từ tab khác: về /login không kèm next', async () => {
  const { router } = renderRoute('/khong-co')
  await screen.findByRole('heading', { name: 'Không tìm thấy trang' })

  const otherTab = new BroadcastChannel(AUTH_CHANNEL)
  otherTab.postMessage({ type: 'signed-out' })

  await waitFor(() =>
    expect(router.state.location.pathname + router.state.location.search).toBe(ROUTES.Login),
  )
  otherTab.close()
})

test('403 password_change_required giữa phiên: đánh dấu phiên rồi tới /change-password', async () => {
  const { router, queryClient } = renderRoute('/khong-co', {
    handlers: [
      mswHttp.get(api('/data'), () =>
        HttpResponse.json(
          { status: 403, code: 'password_change_required', detail: 'Cần đổi mật khẩu.' },
          { status: 403 },
        ),
      ),
    ],
  })
  await screen.findByRole('heading', { name: 'Không tìm thấy trang' })

  await Promise.all([
    http.get('/data').catch(() => undefined),
    http.get('/data').catch(() => undefined),
  ])

  await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.ChangePassword))
  expect(queryClient.getQueryData(sessionQueries.current().queryKey)).toMatchObject({
    mustChangePassword: true,
  })
  expect(router.state.location.state).toEqual(FORCED_NAVIGATION_STATE)
})
