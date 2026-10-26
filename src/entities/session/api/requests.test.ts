import { http, HttpResponse } from 'msw'
import { api } from '@/test/msw/api'
import { makeMeDto } from '@/test/fixtures/user'
import { server } from '@/test/msw/server'
import { onSessionExpired, tokenStore } from '@/shared/api'
import { getCurrentUser } from './requests'

test('getCurrentUser gọi GET /me và trả người dùng theo hình dạng chung', async () => {
  server.use(http.get(api('/me'), () => HttpResponse.json(makeMeDto())))

  const user = await getCurrentUser()

  expect(user).toEqual({
    id: 'u1',
    username: 'an.nv',
    displayName: 'Nguyễn Văn An',
    role: 'member',
    permissions: ['item:read', 'item:write'],
    mustChangePassword: false,
  })
})

describe('token cũ (hồi quy)', () => {
  test('401 ở request đầu, refresh thành công, /me mới có role và permissions, không phát hết phiên', async () => {
    const expired = vi.fn()
    const off = onSessionExpired(expired)
    tokenStore.setSession({ accessToken: 'old-access', refreshToken: 'r0' })
    let refreshCalls = 0
    let meCalls = 0
    server.use(
      http.post(api('/auth/refresh'), () => {
        refreshCalls++
        return HttpResponse.json({ accessToken: 'new-access', refreshToken: 'r1' })
      }),
      http.get(api('/me'), ({ request }) => {
        meCalls++
        return request.headers.get('Authorization') === 'Bearer new-access'
          ? HttpResponse.json(
              makeMeDto({ role: { id: 'role-admin', name: 'admin' }, permissions: ['a:read'] }),
            )
          : HttpResponse.json({ status: 401, code: 'unauthorized', detail: 'x' }, { status: 401 })
      }),
    )

    const user = await getCurrentUser()

    expect(user.role).toBe('admin')
    expect(user.permissions).toEqual(['a:read'])
    expect(refreshCalls).toBe(1)
    expect(meCalls).toBe(2)
    expect(expired).not.toHaveBeenCalled()
    off()
    tokenStore.clear()
  })
})
