import { getAuthAdapter, http, type ChangePasswordInput } from '@/shared/api'

// Thành công không có thân phản hồi; backend có thu hồi phiên hay không là việc của adapter, người gọi vẫn phải
// đăng nhập lại (xem use-change-password-submit).
export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await getAuthAdapter().changePassword(http, input)
}
