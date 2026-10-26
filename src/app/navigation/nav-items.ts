import type { User } from '@/entities/session'
import { ROUTES } from '@/shared/config'
import { messages } from '@/shared/i18n'

export interface NavItem {
  id: string
  label: string
  to: string
  // Gợi ý giao diện theo phiên (ẩn/hiện); guard của route mới là chỗ chặn, backend là thẩm quyền cuối.
  // Không khai báo thì mục luôn hiện.
  visibleFor?: (user: User) => boolean
}

// Thứ tự trong mảng là thứ tự hiển thị. Dự án thêm mục của mình vào đây.
export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'settings', label: messages.nav.settings, to: ROUTES.Settings },
]

export function navItemsFor(user: User, items: readonly NavItem[] = NAV_ITEMS): NavItem[] {
  return items.filter((item) => !item.visibleFor || item.visibleFor(user))
}
