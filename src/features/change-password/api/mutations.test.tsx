import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setAuthAdapterForTest, tokenStore } from '@/shared/api'
import { accessOnlyAdapter } from '@/test/auth/access-only-adapter'
import { makeMeDto } from '@/test/fixtures/user'
import { api } from '@/test/msw/api'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/query-client'
import { createQueryWrapper } from '@/test/wrapper'
import { useChangePasswordMutation, useReloginMutation } from './mutations'

afterEach(() => {
  setAuthAdapterForTest(null)
  tokenStore.clear()
})

test('mật khẩu cũ/mới không nằm lại trong cache mutation sau khi hook gỡ', async () => {
  server.use(http.post(api('/auth/change-password'), () => new HttpResponse(null, { status: 204 })))
  const client = createTestQueryClient()
  const { result, unmount } = renderHook(() => useChangePasswordMutation(), {
    wrapper: createQueryWrapper(client),
  })

  await result.current.mutateAsync({
    currentPassword: 'cu-cu-cu-cu-1',
    newPassword: 'moi-moi-moi-123',
  })
  unmount()

  await waitFor(() => expect(client.getMutationCache().getAll()).toHaveLength(0))
})

test('đăng nhập lại ngầm: mật khẩu mới không nằm lại trong cache mutation sau khi hook gỡ', async () => {
  server.use(
    http.post(api('/auth/login'), () => HttpResponse.json({ accessToken: 'a', refreshToken: 'r' })),
    http.get(api('/me'), () => HttpResponse.json(makeMeDto())),
  )
  const client = createTestQueryClient()
  const { result, unmount } = renderHook(() => useReloginMutation(), {
    wrapper: createQueryWrapper(client),
  })

  await result.current.mutateAsync({ username: 'an.nv', password: 'moi-moi-moi-123' })
  unmount()

  await waitFor(() => expect(client.getMutationCache().getAll()).toHaveLength(0))
})

test('đăng nhập lại ngầm đi qua endpoint của adapter đang dùng', async () => {
  setAuthAdapterForTest(accessOnlyAdapter)
  let body: unknown
  server.use(
    http.post(api('/session/start'), async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ token: 'tok' })
    }),
    http.get(api('/session/me'), () =>
      HttpResponse.json({ uid: '1', name: 'an.nv', roles: ['member'], perms: [] }),
    ),
  )
  const { result } = renderHook(() => useReloginMutation(), {
    wrapper: createQueryWrapper(createTestQueryClient()),
  })

  await result.current.mutateAsync({ username: 'an.nv', password: 'moi-moi-moi-123' })

  expect(body).toEqual({ email: 'an.nv', secret: 'moi-moi-moi-123' })
  expect(tokenStore.getAccess()).toBe('tok')
})
