// Người dùng hiện tại theo hình dạng chung của template; mỗi adapter tự map từ dữ liệu của backend.
export interface AuthUser {
  id: string
  username: string
  displayName: string
  role: string
  permissions: readonly string[]
  mustChangePassword: boolean
}
