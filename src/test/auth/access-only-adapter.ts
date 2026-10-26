import type { AuthAdapter, AuthUser } from '@/shared/api'

interface MeWire {
  uid: string
  name: string
  roles: string[]
  perms: string[]
}

// Adapter thử nghiệm cố ý khác hợp đồng mặc định (không refresh token, endpoint và trường khác)
// để chứng minh AuthAdapter đủ linh hoạt cho backend khác.
export const accessOnlyAdapter: AuthAdapter = {
  refreshSupported: false,
  unauthenticatedPaths: ['/session/start'],

  async login(client, credentials) {
    const { data } = await client.post<{ token: string }>('/session/start', {
      email: credentials.username,
      secret: credentials.password,
    })
    return { accessToken: data.token }
  },

  refresh() {
    return Promise.reject(new Error('unsupported'))
  },

  async logout(client) {
    await client.post('/session/end', undefined, { skipAuthRefresh: true })
  },

  async changePassword(client, input) {
    await client.post('/session/secret', {
      current: input.currentPassword,
      next: input.newPassword,
    })
  },

  async fetchCurrentUser(client, signal) {
    const { data } = await client.get<MeWire>('/session/me', { signal })
    const user: AuthUser = {
      id: data.uid,
      username: data.name,
      displayName: data.name,
      role: data.roles[0] ?? '',
      permissions: [...data.perms],
      mustChangePassword: false,
    }
    return user
  },

  isRefreshTokenSpent: () => true,
  forbiddenRequiresPasswordChange: () => false,
}
