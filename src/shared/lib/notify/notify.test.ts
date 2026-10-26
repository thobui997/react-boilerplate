import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { ApiError } from '@/shared/api'

import { NOTIFY_DEFAULT_TTL_MS, notify, notifyApiError, setNotifier, type Notifier } from './notify'

function createCustom(): Notifier {
  return { info: vi.fn(), success: vi.fn(), error: vi.fn() }
}

describe('notify', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    setNotifier(null)
    document.body.replaceChildren()
    vi.useRealTimers()
  })

  test('notifier mặc định thêm role="status" đúng nội dung và gỡ sau 5000 ms', () => {
    notify.info('Xin chào')

    const el = document.querySelector('[role="status"]')
    expect(el).not.toBeNull()
    expect(el?.textContent).toBe('Xin chào')
    expect(NOTIFY_DEFAULT_TTL_MS).toBe(5000)

    vi.advanceTimersByTime(NOTIFY_DEFAULT_TTL_MS - 1)
    expect(document.querySelector('[role="status"]')).not.toBeNull()

    vi.advanceTimersByTime(1)
    expect(document.querySelector('[role="status"]')).toBeNull()
  })

  test('notifier mặc định áp dụng cho success và error', () => {
    notify.success('Thành công')
    notify.error('Thất bại')

    const texts = [...document.querySelectorAll('[role="status"]')].map((n) => n.textContent)
    expect(texts).toEqual(['Thành công', 'Thất bại'])
  })

  test('setNotifier(custom) chuyển info/success/error sang custom', () => {
    const custom = createCustom()
    setNotifier(custom)

    notify.info('a')
    notify.success('b')
    notify.error('c')

    expect(custom.info).toHaveBeenCalledWith('a')
    expect(custom.success).toHaveBeenCalledWith('b')
    expect(custom.error).toHaveBeenCalledWith('c')
    expect(document.querySelector('[role="status"]')).toBeNull()
  })

  test('setNotifier(null) trả về notifier mặc định', () => {
    const custom = createCustom()
    setNotifier(custom)
    setNotifier(null)

    notify.info('mặc định')

    expect(custom.info).not.toHaveBeenCalled()
    expect(document.querySelector('[role="status"]')?.textContent).toBe('mặc định')
  })

  test('notifyApiError dùng detail của ApiError', () => {
    const custom = createCustom()
    setNotifier(custom)

    notifyApiError(new ApiError({ status: 422, code: 'x', detail: 'Chi tiết' }), 'dự phòng')

    expect(custom.error).toHaveBeenCalledWith('Chi tiết')
  })

  test('notifyApiError dùng dự phòng khi không phải ApiError', () => {
    const custom = createCustom()
    setNotifier(custom)

    notifyApiError(new Error('boom'), 'dự phòng')

    expect(custom.error).toHaveBeenCalledWith('dự phòng')
  })
})
