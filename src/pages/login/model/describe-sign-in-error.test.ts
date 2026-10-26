import { ApiError, ApiErrorCode } from '@/shared/api'
import { describeSignInError } from './describe-sign-in-error'

function apiError(init: Partial<ConstructorParameters<typeof ApiError>[0]>) {
  return new ApiError({ status: 500, code: 'x', detail: 'chi tiết từ máy chủ', ...init })
}

test('401 invalid_credentials', () => {
  expect(
    describeSignInError(apiError({ status: 401, code: ApiErrorCode.InvalidCredentials })),
  ).toEqual({
    title: 'Sai tên đăng nhập hoặc mật khẩu',
    message: 'Kiểm tra lại chữ hoa, chữ thường và bộ gõ tiếng Việt.',
  })
})

test('401 với mã khác không bị coi là sai thông tin đăng nhập', () => {
  expect(describeSignInError(apiError({ status: 401, code: 'unauthorized' })).title).toBe(
    'Không đăng nhập được',
  )
})

test('429 có Retry-After hiện số giây', () => {
  const result = describeSignInError(
    apiError({ status: 429, code: 'too_many_requests', retryAfterSeconds: 30 }),
  )

  expect(result.title).toBe('Thử đăng nhập quá nhiều lần')
  expect(result.message).toContain('30 giây')
})

test('429 không có Retry-After dùng thông báo chung', () => {
  const result = describeSignInError(apiError({ status: 429, code: 'too_many_requests' }))

  expect(result.title).toBe('Thử đăng nhập quá nhiều lần')
  expect(result.message).not.toMatch(/\d+ giây/)
})

test('mất mạng', () => {
  expect(
    describeSignInError(apiError({ status: 0, code: 'network_error', isNetwork: true })),
  ).toEqual({
    title: 'Không có kết nối mạng',
    message: 'Cần có mạng để đăng nhập.',
  })
})

test('lỗi khác dùng detail', () => {
  expect(
    describeSignInError(apiError({ status: 500, code: 'internal_error', detail: 'Máy chủ lỗi.' })),
  ).toEqual({ title: 'Không đăng nhập được', message: 'Máy chủ lỗi.' })
})

test('lỗi không phải ApiError vẫn có thông điệp', () => {
  expect(describeSignInError(new Error('boom'))).toEqual({
    title: 'Không đăng nhập được',
    message: 'Có lỗi xảy ra. Vui lòng thử lại.',
  })
})
