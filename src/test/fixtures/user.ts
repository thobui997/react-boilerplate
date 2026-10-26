import type { AuthUser } from '@/shared/api'

// Hình dạng GET /me của backend mặc định (defaultAdapter); chỉ dùng để dựng phản hồi giả trong test.
export interface MeDto {
  id: string
  username: string
  fullName: string
  role: { id: string; name: string }
  permissions: string[]
  mustChangePassword: boolean
}

// Quyền ghi bằng chuỗi trần để fixture không phụ thuộc hằng số `Permissions` (dự án mới đổi bộ quyền của mình).
export function makeMeDto(overrides: Partial<MeDto> = {}): MeDto {
  return {
    id: 'u1',
    username: 'an.nv',
    fullName: 'Nguyễn Văn An',
    role: { id: 'role-member', name: 'member' },
    permissions: ['item:read', 'item:write'],
    mustChangePassword: false,
    ...overrides,
  }
}

export function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'u1',
    username: 'an.nv',
    displayName: 'Nguyễn Văn An',
    role: 'member',
    permissions: ['item:read', 'item:write'],
    mustChangePassword: false,
    ...overrides,
  }
}
