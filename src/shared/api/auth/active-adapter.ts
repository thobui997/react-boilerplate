import type { AuthAdapter } from './auth-adapter'
import { authAdapter } from './auth.config'

let override: AuthAdapter | null = null

export function getAuthAdapter(): AuthAdapter {
  return override ?? authAdapter
}

// Chỉ dùng trong test: thay adapter đang hoạt động; `null` quay về adapter của auth.config.ts.
export function setAuthAdapterForTest(adapter: AuthAdapter | null): void {
  override = adapter
}
