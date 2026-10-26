import { useQueryClient } from '@tanstack/react-query'
import {
  ApiError,
  ApiErrorCode,
  broadcastSignOut,
  getErrorMessage,
  HttpStatus,
  tokenStore,
} from '@/shared/api'
import { messages } from '@/shared/i18n'
import { fieldErrorsFromApi } from '@/shared/lib/form-errors'
import { notifyApiError } from '@/shared/lib/notify'
import { useChangePasswordMutation, useReloginMutation } from '../api/mutations'
import type { ChangePasswordValues } from './change-password-schema'

export type ChangePasswordOutcome =
  | { kind: 'changed' }
  | { kind: 'relogin-failed' }
  | { kind: 'field-error'; field: 'currentPassword' | 'newPassword'; message: string }
  | { kind: 'failed'; message: string }

// Lỗi thuộc một ô thì trả về cho form (form.setError); lỗi chung được báo qua notify và trả về để form hiện tại chỗ.
function describeChangeError(error: unknown): ChangePasswordOutcome {
  if (error instanceof ApiError) {
    if (
      error.status === HttpStatus.Unauthorized &&
      error.code === ApiErrorCode.InvalidCredentials
    ) {
      return { kind: 'field-error', field: 'currentPassword', message: error.detail }
    }
    if (error.code === ApiErrorCode.WeakPassword) {
      return { kind: 'field-error', field: 'newPassword', message: error.detail }
    }
    if (error.status === HttpStatus.UnprocessableEntity) {
      const [first] = fieldErrorsFromApi(error.errors)
      if (first?.path === 'currentPassword' || first?.path === 'newPassword') {
        return { kind: 'field-error', field: first.path, message: first.message }
      }
    }
  }
  notifyApiError(error, messages.changePassword.failed)
  return { kind: 'failed', message: getErrorMessage(error, messages.changePassword.failed) }
}

export function useChangePasswordSubmit(opts: {
  username: string
  onChanged: () => void
  onReloginFailed: () => void
}) {
  const queryClient = useQueryClient()
  const changeMutation = useChangePasswordMutation()
  const reloginMutation = useReloginMutation()

  const submit = async (values: ChangePasswordValues): Promise<ChangePasswordOutcome> => {
    try {
      await changeMutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
    } catch (error) {
      return describeChangeError(error)
    }

    // Refresh token cũ đã bị server thu hồi: bỏ ngay để không có request nào dùng lại nó (bị coi là tái sử dụng
    // và thu hồi cả phiên mới).
    tokenStore.clear()
    // Server đã thu hồi mọi refresh token: đăng nhập lại ngầm bằng mật khẩu mới (chỉ giữ trong bộ nhớ cho lần gọi này).
    try {
      await reloginMutation.mutateAsync({ username: opts.username, password: values.newPassword })
    } catch {
      queryClient.clear()
      // Các tab khác còn giữ phiên đã bị thu hồi: báo để chúng về màn đăng nhập.
      broadcastSignOut()
      opts.onReloginFailed()
      return { kind: 'relogin-failed' }
    }
    opts.onChanged()
    return { kind: 'changed' }
  }

  return { submit, isPending: changeMutation.isPending || reloginMutation.isPending }
}
