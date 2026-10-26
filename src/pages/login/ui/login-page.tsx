import { useLocation } from 'react-router'
import { APP_NAME } from '@/shared/config'
import { messages } from '@/shared/i18n'
import { useLoginSubmit } from '../model/use-login-submit'
import { LoginFormSection } from './login-form-section'

export function LoginPage() {
  const { submit, isPending, error } = useLoginSubmit()
  // Đổi mật khẩu xong nhưng đăng nhập lại ngầm lỗi: trang đổi mật khẩu chuyển tới đây kèm cờ trong state.
  const state = useLocation().state as { passwordChanged?: boolean } | null

  return (
    <main>
      <p>{APP_NAME}</p>
      <h1>{messages.login.title}</h1>
      {state?.passwordChanged && <p role="status">{messages.login.passwordChanged}</p>}
      {error && (
        <p role="alert">
          <strong>{error.title}</strong> {error.message}
        </p>
      )}
      <LoginFormSection onSubmit={submit} isPending={isPending} />
      <p>{messages.login.forgotPassword}</p>
    </main>
  )
}
