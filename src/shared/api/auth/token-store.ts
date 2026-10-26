import { STORAGE_KEYS } from '@/shared/config'
import { getAuthAdapter } from './active-adapter'
import type { AuthTokens } from './auth-adapter'

const SESSION_KEY = STORAGE_KEYS.Session

// Access token chỉ ở bộ nhớ (ngắn hạn) khi adapter có refresh; credential dài hạn (refresh token xoay vòng) nằm trong
// localStorage để sống qua lần tải lại. Adapter không có refresh thì credential dài hạn chính là access token.
// `refreshSupported` được đọc tại thời điểm gọi, không cache, để test đổi adapter được.
let accessToken: string | null = null
// Bản trong bộ nhớ chỉ được dùng khi localStorage không ghi được: nếu không, currentCredential() sẽ trả lại credential
// cũ đã bị server thu hồi, và lần refresh sau bị coi là tái sử dụng (thu hồi mọi phiên).
let memoryCredential: string | null = null
let isStorageUsable = true

function readStorage(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    isStorageUsable = false
    return null
  }
}

function writeStorage(token: string | null): void {
  try {
    if (token === null) localStorage.removeItem(SESSION_KEY)
    else localStorage.setItem(SESSION_KEY, token)
    isStorageUsable = true
  } catch {
    isStorageUsable = false
    // Không ghi được thì phải bỏ bản cũ, tránh để lại token đã bị thu hồi.
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      // Storage hỏng hẳn: chỉ còn bản trong bộ nhớ.
    }
  }
}

function currentCredential(): string | null {
  if (isStorageUsable) {
    const stored = readStorage()
    // readStorage có thể vừa đánh dấu storage hỏng: khi đó dùng bản trong bộ nhớ thay vì coi như hết phiên.
    if (isStorageUsable) return stored
  }
  return memoryCredential
}

export const tokenStore = {
  setSession(tokens: AuthTokens): void {
    const credential = getAuthAdapter().refreshSupported
      ? (tokens.refreshToken ?? null)
      : tokens.accessToken
    accessToken = tokens.accessToken
    memoryCredential = credential
    writeStorage(credential)
  },
  getAccess(): string | null {
    if (accessToken !== null) return accessToken
    // Không có refresh: access token đã lưu là phiên sau khi tải lại trang.
    return getAuthAdapter().refreshSupported ? null : currentCredential()
  },
  getRefresh(): string | null {
    return getAuthAdapter().refreshSupported ? currentCredential() : null
  },
  clear(): void {
    accessToken = null
    memoryCredential = null
    writeStorage(null)
  },
  hasSession(): boolean {
    return currentCredential() !== null
  },
  // Chỉ dùng trong test: xoá biến trong bộ nhớ (không đụng localStorage) để mô phỏng tải lại trang.
  resetMemoryForTest(): void {
    accessToken = null
    memoryCredential = null
    isStorageUsable = true
  },
}
