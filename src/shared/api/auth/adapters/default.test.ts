import type { AxiosInstance } from 'axios'
import { ApiError } from '../../api-error'
import { ApiErrorCode } from '../../error-codes'
import { defaultAdapter } from './default'

function fakeClient() {
  const post = vi.fn()
  const get = vi.fn()
  return { client: { post, get } as unknown as AxiosInstance, post, get }
}

function apiError(status: number, code = 'x', isNetwork = false): ApiError {
  return new ApiError({ status, code, detail: 'x', isNetwork })
}

describe('defaultAdapter', () => {
  test('khai báo refresh được hỗ trợ và các đường dẫn không cần xác thực', () => {
    expect(defaultAdapter.refreshSupported).toBe(true)
    expect(defaultAdapter.unauthenticatedPaths).toEqual(['/auth/login', '/auth/refresh'])
  })

  test('login gửi {username,password} tới /auth/login và trả token', async () => {
    const { client, post } = fakeClient()
    post.mockResolvedValue({ data: { accessToken: 'a1', refreshToken: 'r1', extra: 1 } })

    const tokens = await defaultAdapter.login(client, { username: 'u', password: 'p' })

    expect(post).toHaveBeenCalledWith('/auth/login', { username: 'u', password: 'p' })
    expect(tokens).toEqual({ accessToken: 'a1', refreshToken: 'r1' })
  })

  test('refresh gửi {refreshToken} tới /auth/refresh và trả cặp token mới', async () => {
    const { client, post } = fakeClient()
    post.mockResolvedValue({ data: { accessToken: 'a2', refreshToken: 'r2' } })

    const tokens = await defaultAdapter.refresh(client, 'r1')

    expect(post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'r1' })
    expect(tokens).toEqual({ accessToken: 'a2', refreshToken: 'r2' })
  })

  test('logout gửi {refreshToken} kèm skipAuthRefresh', async () => {
    const { client, post } = fakeClient()
    post.mockResolvedValue({ data: undefined })

    await defaultAdapter.logout(client, 'r1')

    expect(post).toHaveBeenCalledWith(
      '/auth/logout',
      { refreshToken: 'r1' },
      { skipAuthRefresh: true },
    )
  })

  test('changePassword gửi hai mật khẩu tới /auth/change-password', async () => {
    const { client, post } = fakeClient()
    post.mockResolvedValue({ data: undefined })

    await defaultAdapter.changePassword(client, { currentPassword: 'old', newPassword: 'new' })

    expect(post).toHaveBeenCalledWith('/auth/change-password', {
      currentPassword: 'old',
      newPassword: 'new',
    })
  })

  test('fetchCurrentUser map fullName/role.name thành displayName/role và chuyền signal', async () => {
    const { client, get } = fakeClient()
    get.mockResolvedValue({
      data: {
        id: '7',
        username: 'alice',
        fullName: 'Alice Nguyen',
        role: { id: 'r', name: 'admin' },
        permissions: ['a', 'b'],
        mustChangePassword: true,
      },
    })
    const { signal } = new AbortController()

    const user = await defaultAdapter.fetchCurrentUser(client, signal)

    expect(get).toHaveBeenCalledWith('/me', { signal })
    expect(user).toEqual({
      id: '7',
      username: 'alice',
      displayName: 'Alice Nguyen',
      role: 'admin',
      permissions: ['a', 'b'],
      mustChangePassword: true,
    })
  })

  test.each([
    ['401', apiError(401), true],
    ['lỗi mạng', apiError(0, ApiErrorCode.NetworkError, true), true],
    ['500', apiError(500), true],
    ['429', apiError(429), false],
    ['400', apiError(400), false],
  ])('isRefreshTokenSpent: %s -> %s', (_name, error, expected) => {
    expect(defaultAdapter.isRefreshTokenSpent(error)).toBe(expected)
  })

  test.each([
    ['401 + unauthorized', apiError(401, 'unauthorized'), true],
    ['401 không có thân lỗi (http_401)', apiError(401, 'http_401'), true],
    ['401 + invalid_credentials', apiError(401, ApiErrorCode.InvalidCredentials), false],
    ['403 + forbidden', apiError(403, ApiErrorCode.Forbidden), false],
  ])('isAccessTokenRejected: %s -> %s', (_name, error, expected) => {
    expect(defaultAdapter.isAccessTokenRejected(error)).toBe(expected)
  })

  test.each([
    ['403 + password_change_required', apiError(403, ApiErrorCode.PasswordChangeRequired), true],
    ['403 + forbidden', apiError(403, ApiErrorCode.Forbidden), false],
    ['401 + password_change_required', apiError(401, ApiErrorCode.PasswordChangeRequired), false],
  ])('forbiddenRequiresPasswordChange: %s -> %s', (_name, error, expected) => {
    expect(defaultAdapter.forbiddenRequiresPasswordChange(error)).toBe(expected)
  })
})
