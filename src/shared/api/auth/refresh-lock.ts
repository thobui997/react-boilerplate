import { REFRESH_LOCK_NAME, STORAGE_KEYS } from '@/shared/config'

const LOCK_TTL_MS = 10_000
const POLL_MS = 25

interface StoredLock {
  owner: string
  expiresAt: number
}

function readLock(): StoredLock | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SessionLock)
    return raw ? (JSON.parse(raw) as StoredLock) : null
  } catch {
    return null
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Dự phòng cho trình duyệt không có Web Locks: tốt nhất có thể, không nguyên tử tuyệt đối giữa các tab.
// Phần còn lại của an toàn nằm ở bước đọc lại refresh token trong khoá (refresh-session.ts).
async function withStorageLock<T>(task: () => Promise<T>): Promise<T> {
  const owner = `${Date.now()}-${Math.random()}`
  for (;;) {
    const held = readLock()
    if (!held || held.expiresAt <= Date.now()) {
      try {
        localStorage.setItem(
          STORAGE_KEYS.SessionLock,
          JSON.stringify({ owner, expiresAt: Date.now() + LOCK_TTL_MS }),
        )
      } catch {
        return task()
      }
      await delay(0)
      if (readLock()?.owner === owner) break
    }
    await delay(POLL_MS)
  }
  try {
    return await task()
  } finally {
    if (readLock()?.owner === owner) localStorage.removeItem(STORAGE_KEYS.SessionLock)
  }
}

export function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
  return locks ? locks.request(REFRESH_LOCK_NAME, task) : withStorageLock(task)
}
