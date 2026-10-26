import type { ValueOf } from '@/shared/lib/const-enum'

// Điểm dự án mới thay bằng vai trò và quyền của mình. Giá trị phải khớp với những gì backend trả về
// trong `AuthUser.role` và `AuthUser.permissions`.
export const Roles = {
  Admin: 'admin',
  Member: 'member',
} as const
export type Role = ValueOf<typeof Roles>

export const Permissions = {
  // <example-item>
  ItemRead: 'item:read',
  ItemWrite: 'item:write',
  // </example-item>
} as const
export type Permission = ValueOf<typeof Permissions>
