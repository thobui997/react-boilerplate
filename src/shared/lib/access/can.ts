// Kiểm tra quyền chỉ phục vụ giao diện (ẩn/hiện); backend vẫn là nơi quyết định cuối cùng.
export function can(user: { permissions: readonly string[] }, permission: string): boolean {
  return user.permissions.includes(permission)
}

export function canAny(
  user: { permissions: readonly string[] },
  permissions: readonly string[],
): boolean {
  return permissions.some((permission) => can(user, permission))
}

export function hasRole(user: { role: string }, roles: readonly string[]): boolean {
  return roles.includes(user.role)
}
