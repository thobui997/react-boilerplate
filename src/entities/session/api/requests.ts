import { getAuthAdapter, http } from '@/shared/api'
import type { User } from '../model/user'

// Endpoint và hình dạng phản hồi thuộc về adapter đang hoạt động (xem shared/api/auth/auth.config.ts).
export function getCurrentUser(signal?: AbortSignal): Promise<User> {
  return getAuthAdapter().fetchCurrentUser(http, signal)
}
