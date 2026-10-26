import { ROUTES } from '@/shared/config'
import { can } from '@/shared/lib/access'
import { makeUser } from '@/test/fixtures/user'
import { navItemsFor, type NavItem } from './nav-items'

test('mặc định chỉ có mục Cài đặt, hiện cho mọi người dùng', () => {
  const items = navItemsFor(makeUser({ permissions: [] }))

  expect(items.map((item) => item.label)).toEqual(['Cài đặt'])
  expect(items[0]).toMatchObject({ id: 'settings', to: ROUTES.Settings })
})

test('mục có visibleFor chỉ hiện khi hàm trả true; không có visibleFor thì luôn hiện', () => {
  const items: NavItem[] = [
    { id: 'open', label: 'Mở', to: '/open' },
    { id: 'gated', label: 'Có quyền', to: '/gated', visibleFor: (user) => can(user, 'x:read') },
  ]

  expect(navItemsFor(makeUser({ permissions: [] }), items).map((item) => item.id)).toEqual(['open'])
  expect(navItemsFor(makeUser({ permissions: ['x:read'] }), items).map((item) => item.id)).toEqual([
    'open',
    'gated',
  ])
})
