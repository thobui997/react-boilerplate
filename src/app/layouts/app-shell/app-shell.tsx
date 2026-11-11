import { NavLink, Outlet } from 'react-router'
import { navItemsFor } from '@/app/navigation'
import { useCurrentUser } from '@/entities/session'
import { messages } from '@/shared/i18n'
import { cn } from '@/shared/lib/cn'
import { AccountBar } from './account-bar'

// Khung ứng dụng: HTML ngữ nghĩa kèm bố cục Tailwind; nút dùng component của shared/ui.
export function AppShell() {
  const user = useCurrentUser()

  // Loader đã bảo đảm có phiên; nhánh này chỉ để thoả kiểu.
  if (!user) return null

  return (
    <div className="min-h-screen">
      <header className="border-b px-4 py-2">
        <AccountBar user={user} />
      </header>
      <nav aria-label={messages.shell.mainNav} className="border-b px-4 py-2">
        <ul className="flex gap-4">
          {navItemsFor(user).map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn('text-sm hover:underline', isActive && 'font-semibold')
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  )
}
