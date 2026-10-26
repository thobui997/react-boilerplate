import { NavLink, Outlet } from 'react-router'
import { navItemsFor } from '@/app/navigation'
import { useCurrentUser } from '@/entities/session'
import { messages } from '@/shared/i18n'
import { AccountBar } from './account-bar'

// Khung ứng dụng bằng HTML ngữ nghĩa thuần; dự án tự thêm style/bố cục của mình.
export function AppShell() {
  const user = useCurrentUser()

  // Loader đã bảo đảm có phiên; nhánh này chỉ để thoả kiểu.
  if (!user) return null

  return (
    <>
      <header>
        <AccountBar user={user} />
      </header>
      <nav aria-label={messages.shell.mainNav}>
        <ul>
          {navItemsFor(user).map((item) => (
            <li key={item.id}>
              <NavLink to={item.to}>{item.label}</NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  )
}
