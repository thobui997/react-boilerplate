import { useNavigate } from 'react-router'
import type { User } from '@/entities/session'
import { useSignOut } from '@/features/sign-out'
import { ThemeToggleButton } from '@/features/toggle-theme'
import { ROUTES } from '@/shared/config'
import { messages } from '@/shared/i18n'
import { Button } from '@/shared/ui/button'

export function AccountBar({ user }: { user: User }) {
  const signOut = useSignOut()
  const navigate = useNavigate()

  // useSignOut chỉ báo các tab khác; tab này tự về trang đăng nhập.
  const handleSignOut = async () => {
    await signOut()
    await navigate(ROUTES.Login, { replace: true })
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <span className="text-sm">{user.displayName}</span>
      <ThemeToggleButton />
      <Button type="button" variant="outline" onClick={handleSignOut}>
        {messages.signOut.action}
      </Button>
    </div>
  )
}
