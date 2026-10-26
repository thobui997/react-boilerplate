import { useMutation, useQueryClient } from '@tanstack/react-query'
import { signInAndLoadUser } from '@/entities/session'
import type { ApiError, ChangePasswordInput, Credentials } from '@/shared/api'
import { changePassword } from './requests'

export function useChangePasswordMutation() {
  return useMutation<void, ApiError, ChangePasswordInput>({
    mutationFn: changePassword,
    // Mật khẩu cũ/mới nằm trong variables: không giữ lại trong cache mutation sau khi form gỡ.
    gcTime: 0,
    // Không có truy vấn nào cần làm mới: server thu hồi phiên nên bước kế tiếp là đăng nhập lại (use-change-password-submit).
  })
}

// Đăng nhập lại ngầm bằng mật khẩu mới (server đã thu hồi mọi refresh token).
export function useReloginMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, Credentials>({
    mutationFn: (credentials) => signInAndLoadUser(queryClient, credentials),
    // Mật khẩu nằm trong variables: không giữ lại trong cache mutation sau khi form gỡ.
    gcTime: 0,
  })
}
