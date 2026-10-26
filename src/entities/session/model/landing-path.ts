import { ROUTES } from '@/shared/config'
import { can } from '@/shared/lib/access'
// <example-item>
import { Permissions } from '@/shared/lib/access'
// </example-item>
import type { User } from './user'

// Trang đích sau đăng nhập, theo thứ tự ưu tiên: quy tắc đầu tiên mà người dùng có quyền sẽ thắng, không khớp thì về
// trang cài đặt. Mọi đích phải vào được mà không cần quyền nào người dùng chưa có, nếu không guard sẽ chuyển hướng vòng.
const LANDING_RULES: readonly { permission: string; path: string }[] = [
  // <example-item>
  { permission: Permissions.ItemRead, path: ROUTES.ExampleItems },
  // </example-item>
]

export function landingPathFor(user: User): string {
  return LANDING_RULES.find((rule) => can(user, rule.permission))?.path ?? ROUTES.Settings
}
