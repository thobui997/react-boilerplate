import { useMutation, useQueryClient } from '@tanstack/react-query'
import { signInAndLoadUser } from '@/entities/session'
import type { ApiError, Credentials } from '@/shared/api'

export function useSignInMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, Credentials>({
    mutationFn: (credentials) => signInAndLoadUser(queryClient, credentials),
    // Mật khẩu nằm trong variables: không giữ lại trong cache mutation sau khi trang gỡ.
    gcTime: 0,
  })
}
