import { useNavigate } from 'react-router'
import { useCurrentUser } from '@/entities/session'
import { useSignOut } from '@/features/sign-out'
import { ROUTES } from '@/shared/config'
import { messages } from '@/shared/i18n'
import { notify } from '@/shared/lib/notify'
import { AccountSection } from './account-section'
import { AppearanceSection } from './appearance-section'
import { PasswordSection } from './password-section'
import { ProfileSection } from './profile-section'

// Không bọc <main>: trang hiện bên trong khung ứng dụng (đã có <main>).
export function SettingsPage() {
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
    <div>
      <h1>{messages.settings.title}</h1>
      <ProfileSection user={user} />
      <AppearanceSection />
      <PasswordSection
        username={user.username}
        onChanged={() => notify.success(messages.settings.password.changed)}
        // Đăng nhập lại ngầm lỗi: phiên cũ đã bị thu hồi nên phải đăng nhập lại.
        onReloginFailed={() =>
          void navigate(ROUTES.Login, { replace: true, state: { passwordChanged: true } })
        }
      />
      <AccountSection onSignOut={handleSignOut} />
    </div>
  )
}
