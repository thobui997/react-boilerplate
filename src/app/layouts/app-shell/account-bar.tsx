import { useNavigate } from 'react-router'
import type { User } from '@/entities/session'
import { useSignOut } from '@/features/sign-out'
import { ThemeToggleButton } from '@/features/toggle-theme'
import { ROUTES } from '@/shared/config'
import { messages } from '@/shared/i18n'

export function AccountBar({ user }: { user: User }) {
  const signOut = useSignOut()
  const navigate = useNavigate()

  // useSignOut chỉ báo các tab khác; tab này tự về trang đăng nhập.
  const handleSignOut = async () => {
    await signOut()
    await navigate(ROUTES.Login, { replace: true })
  }

  return (
    <div>
      <span>{user.displayName}</span> <ThemeToggleButton />{' '}
      <button type="button" onClick={handleSignOut}>
        {messages.signOut.action}
      </button>
    </div>
  )
}
