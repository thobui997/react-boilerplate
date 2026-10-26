import { STORAGE_KEYS } from '@/shared/config'
import { accessOnlyAdapter } from '@/test/auth/access-only-adapter'
import { setAuthAdapterForTest } from './active-adapter'
import { tokenStore } from './token-store'

beforeEach(() => {
  tokenStore.clear()
  localStorage.clear()
})

afterEach(() => {
  setAuthAdapterForTest(null)
})

test('access token chỉ ở bộ nhớ, refresh token ở localStorage', () => {
  tokenStore.setSession({ accessToken: 'a', refreshToken: 'r' })

  expect(tokenStore.getAccess()).toBe('a')
  expect(tokenStore.getRefresh()).toBe('r')
  expect(localStorage.getItem(STORAGE_KEYS.Session)).toBe('r')
  expect(JSON.stringify({ ...localStorage })).not.toContain('"a"')
  expect(tokenStore.hasSession()).toBe(true)
})

test('clear xoá cả hai token', () => {
  tokenStore.setSession({ accessToken: 'a', refreshToken: 'r' })

  tokenStore.clear()

  expect(tokenStore.getAccess()).toBeNull()
  expect(tokenStore.getRefresh()).toBeNull()
  expect(tokenStore.hasSession()).toBe(false)
})

test('localStorage ném lỗi thì không crash và coi như không có phiên', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('denied', 'SecurityError')
  })

  expect(tokenStore.getRefresh()).toBeNull()
  expect(tokenStore.hasSession()).toBe(false)

  vi.restoreAllMocks()
})

test('ghi refresh token mới thất bại thì không bao giờ trả lại token cũ đã bị thu hồi', () => {
  tokenStore.setSession({ accessToken: 'a0', refreshToken: 'r0' })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('quota', 'QuotaExceededError')
  })

  tokenStore.setSession({ accessToken: 'a1', refreshToken: 'r1' })

  expect(tokenStore.getRefresh()).toBe('r1')
  expect(tokenStore.hasSession()).toBe(true)
  vi.restoreAllMocks()
})

test('clear sau khi storage từng lỗi vẫn xoá sạch phiên', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('quota', 'QuotaExceededError')
  })
  tokenStore.setSession({ accessToken: 'a1', refreshToken: 'r1' })
  vi.restoreAllMocks()

  tokenStore.clear()

  expect(tokenStore.getRefresh()).toBeNull()
})

describe('adapter không có refresh (credential dài hạn là chính access token)', () => {
  beforeEach(() => {
    setAuthAdapterForTest(accessOnlyAdapter)
  })

  test('adapter không có refresh: sau reload (resetMemoryForTest) phiên vẫn còn và getAccess trả đúng token', () => {
    tokenStore.setSession({ accessToken: 'a' })
    expect(localStorage.getItem(STORAGE_KEYS.Session)).toBe('a')

    tokenStore.resetMemoryForTest()

    expect(tokenStore.hasSession()).toBe(true)
    expect(tokenStore.getAccess()).toBe('a')
    expect(tokenStore.getRefresh()).toBeNull()
  })

  test('adapter không có refresh: clear xoá credential đã lưu', () => {
    tokenStore.setSession({ accessToken: 'a' })

    tokenStore.clear()
    tokenStore.resetMemoryForTest()

    expect(localStorage.getItem(STORAGE_KEYS.Session)).toBeNull()
    expect(tokenStore.getAccess()).toBeNull()
    expect(tokenStore.hasSession()).toBe(false)
  })

  test('adapter không có refresh: localStorage ném lỗi thì phiên chỉ còn trong bộ nhớ và không crash', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })

    expect(() => tokenStore.setSession({ accessToken: 'a' })).not.toThrow()

    expect(tokenStore.getAccess()).toBe('a')
    expect(tokenStore.hasSession()).toBe(true)
    expect(tokenStore.getRefresh()).toBeNull()
    vi.restoreAllMocks()
  })
})
