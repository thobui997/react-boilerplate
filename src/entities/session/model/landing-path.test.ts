import { ROUTES } from '@/shared/config'
// <example-item>
import { Permissions } from '@/shared/lib/access'
// </example-item>
import { makeUser } from '@/test/fixtures/user'
import { landingPathFor } from './landing-path'

test('người dùng không có quyền nào về trang cài đặt', () => {
  expect(landingPathFor(makeUser({ permissions: [] }))).toBe(ROUTES.Settings)
})

// <example-item>
test('người dùng có item:read về danh sách mẫu', () => {
  expect(landingPathFor(makeUser({ permissions: [Permissions.ItemRead] }))).toBe(
    ROUTES.ExampleItems,
  )
})
// </example-item>
