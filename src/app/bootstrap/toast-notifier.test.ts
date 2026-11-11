import { toast } from 'sonner'
import { toastNotifier } from './toast-notifier'

vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }))

afterEach(() => vi.clearAllMocks())

describe('toastNotifier', () => {
  test('info chuyển chuỗi cho toast.info', () => {
    toastNotifier.info('a')

    expect(toast.info).toHaveBeenCalledExactlyOnceWith('a')
  })

  test('success chuyển chuỗi cho toast.success', () => {
    toastNotifier.success('b')

    expect(toast.success).toHaveBeenCalledExactlyOnceWith('b')
  })

  test('error chuyển chuỗi cho toast.error', () => {
    toastNotifier.error('c')

    expect(toast.error).toHaveBeenCalledExactlyOnceWith('c')
  })
})
