import type { AuthAdapter } from './auth-adapter'
import { defaultAdapter } from './adapters/default'

// Đây là file duy nhất dự án mới cần sửa để đổi backend: trỏ `authAdapter` tới adapter của backend đó.
export const authAdapter: AuthAdapter = defaultAdapter
