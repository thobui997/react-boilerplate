import { useNavigate } from 'react-router'
import { landingPathFor, useCurrentUser } from '@/entities/session'
import { ChangePasswordForm } from '@/features/change-password'
import { useSignOut } from '@/features/sign-out'
import { ROUTES } from '@/shared/config'
import { messages } from '@/shared/i18n'
import { Button } from '@/shared/ui/button'

// Nằm ngoài khung ứng dụng (guard của khung chuyển người dùng bị buộc đổi mật khẩu về đây), nên tự có <main>.
export function ChangePasswordPage() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const signOut = useSignOut()

  // Loader đã bảo đảm có phiên; nhánh này chỉ để thoả kiểu.
  if (!user) return null

  // useSignOut chỉ báo các tab khác; tab này tự về trang đăng nhập.
  const handleSignOut = async () => {
    await signOut()
    await navigate(ROUTES.Login, { replace: true })
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <header className="flex flex-col gap-1">
        <p className="text-muted-foreground text-sm">{messages.changePassword.page.eyebrow}</p>
        <h1 className="text-xl font-semibold">{messages.changePassword.page.title}</h1>
        <p>{messages.changePassword.page.reminder(user.displayName)}</p>
      </header>
      <ChangePasswordForm
        username={user.username}
        mode="forced"
        onChanged={() => void navigate(landingPathFor(user), { replace: true })}
        onReloginFailed={() =>
          void navigate(ROUTES.Login, { replace: true, state: { passwordChanged: true } })
        }
      />
      <Button type="button" variant="outline" onClick={handleSignOut}>
        {messages.signOut.action}
      </Button>
    </main>
  )
}
