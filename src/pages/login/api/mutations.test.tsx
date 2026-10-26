import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { sessionQueries } from '@/entities/session'
import { tokenStore } from '@/shared/api'
import { makeMeDto } from '@/test/fixtures/user'
import { api } from '@/test/msw/api'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/query-client'
import { createQueryWrapper } from '@/test/wrapper'
import { useSignInMutation } from './mutations'

const LOGIN_OK = () =>
  HttpResponse.json({ accessToken: 'a', refreshToken: 'r', expiresAt: '2026-10-12T01:00:00Z' })

beforeEach(() => {
  tokenStore.clear()
})

test('mutateAsync chỉ resolve sau khi người dùng hiện tại được tải xong (đúng một lần)', async () => {
  let meCalls = 0
  let meCallsAtResolve = -1
  server.use(
    http.post(api('/auth/login'), LOGIN_OK),
    http.get(api('/me'), async () => {
      meCalls++
      await new Promise((resolve) => setTimeout(resolve, 30))
      return HttpResponse.json(makeMeDto())
    }),
  )
  const client = createTestQueryClient()
  const { result } = renderHook(() => useSignInMutation(), { wrapper: createQueryWrapper(client) })

  await result.current.mutateAsync({ username: 'an.nv', password: 'mat-khau-dai-123' }).then(() => {
    meCallsAtResolve = meCalls
  })

  expect(meCallsAtResolve).toBe(1)
  expect(client.getQueryData(sessionQueries.current().queryKey)).toMatchObject({
    displayName: 'Nguyễn Văn An',
  })
})

test('đăng nhập sai thì mutation lỗi và không tải người dùng', async () => {
  let meCalls = 0
  server.use(
    http.post(api('/auth/login'), () =>
      HttpResponse.json(
        { status: 401, code: 'invalid_credentials', detail: 'Sai.' },
        { status: 401 },
      ),
    ),
    http.get(api('/me'), () => {
      meCalls++
      return HttpResponse.json(makeMeDto())
    }),
  )
  const { result } = renderHook(() => useSignInMutation(), {
    wrapper: createQueryWrapper(createTestQueryClient()),
  })

  await expect(
    result.current.mutateAsync({ username: 'an.nv', password: 'x' }),
  ).rejects.toMatchObject({ code: 'invalid_credentials' })

  expect(meCalls).toBe(0)
})

test('mật khẩu trong variables không nằm lại trong cache mutation sau khi hook gỡ', async () => {
  server.use(
    http.post(api('/auth/login'), LOGIN_OK),
    http.get(api('/me'), () => HttpResponse.json(makeMeDto())),
  )
  const client = createTestQueryClient()
  const { result, unmount } = renderHook(() => useSignInMutation(), {
    wrapper: createQueryWrapper(client),
  })

  await result.current.mutateAsync({ username: 'an.nv', password: 'mat-khau-dai-123' })
  unmount()

  await waitFor(() => expect(client.getMutationCache().getAll()).toHaveLength(0))
})

test('đăng nhập đúng nhưng lấy người dùng lỗi: không để lại phiên mồ côi', async () => {
  server.use(
    http.post(api('/auth/login'), LOGIN_OK),
    http.get(api('/me'), () =>
      HttpResponse.json({ status: 500, code: 'internal_error', detail: 'x' }, { status: 500 }),
    ),
  )
  const { result } = renderHook(() => useSignInMutation(), {
    wrapper: createQueryWrapper(createTestQueryClient()),
  })

  await expect(
    result.current.mutateAsync({ username: 'an.nv', password: 'mat-khau-dai-123' }),
  ).rejects.toBeTruthy()

  expect(tokenStore.hasSession()).toBe(false)
})
