import { REFRESH_LOCK_NAME, STORAGE_KEYS } from '@/shared/config'
import { withRefreshLock } from './refresh-lock'

const LOCK_KEY = STORAGE_KEYS.SessionLock

afterEach(() => {
  Reflect.deleteProperty(navigator, 'locks')
  localStorage.clear()
  vi.useRealTimers()
})

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

test('dùng navigator.locks khi có, với đúng tên khoá', async () => {
  const request = vi.fn((_name: string, callback: () => Promise<unknown>) => callback())
  Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })

  const result = await withRefreshLock(async () => 'ok')

  expect(result).toBe('ok')
  expect(request).toHaveBeenCalledWith(REFRESH_LOCK_NAME, expect.any(Function))
})

describe('khoá thủ công qua localStorage (không có Web Locks)', () => {
  test('hai lần gọi đồng thời chạy tuần tự, không chồng nhau', async () => {
    const events: string[] = []
    const task = (name: string) => async () => {
      events.push(`start ${name}`)
      await delay(30)
      events.push(`end ${name}`)
    }

    await Promise.all([withRefreshLock(task('a')), withRefreshLock(task('b'))])

    expect(events).toEqual(['start a', 'end a', 'start b', 'end b'])
    expect(localStorage.getItem(LOCK_KEY)).toBeNull()
  })

  test('nhả khoá kể cả khi tác vụ lỗi', async () => {
    await expect(
      withRefreshLock(async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    expect(localStorage.getItem(LOCK_KEY)).toBeNull()
  })

  test('khoá quá TTL 10 giây bị coi là bỏ rơi và được chiếm lại', async () => {
    localStorage.setItem(LOCK_KEY, JSON.stringify({ owner: 'tab-chet', expiresAt: Date.now() - 1 }))

    const result = await withRefreshLock(async () => 'ok')

    expect(result).toBe('ok')
  })
})
