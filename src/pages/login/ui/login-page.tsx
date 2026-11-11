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
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-6">
      <p className="text-muted-foreground text-sm">{APP_NAME}</p>
      <h1 className="text-xl font-semibold">{messages.login.title}</h1>
      {state?.passwordChanged && <p role="status">{messages.login.passwordChanged}</p>}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          <strong>{error.title}</strong> {error.message}
        </p>
      )}
      <LoginFormSection onSubmit={submit} isPending={isPending} />
      <p className="text-muted-foreground text-sm">{messages.login.forgotPassword}</p>
    </main>
  )
}
